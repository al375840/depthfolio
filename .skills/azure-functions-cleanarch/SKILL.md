---
name: azure-functions-cleanarch
description: Apply Clean Architecture (Api / Application / Domain / Infrastructure) to a .NET 8 isolated-worker Azure Function with a single HTTP endpoint. Covers project references, dependency injection, value objects, handler pattern, and the contact-form example.
---

# Clean Architecture in an Azure Function

## What and why

Even a single-endpoint Function benefits from layered architecture: the layering is what lets the endpoint grow without rewrites, makes the domain testable in isolation, and demonstrates engineering maturity to anyone reading the code.

## Project layout

Four projects, in `apps/api/src/`:

| Project | Depends on | Owns |
|---|---|---|
| `Portfolio.Api` | `Application`, `Infrastructure` | HTTP triggers, DTOs, DI composition root |
| `Portfolio.Application` | `Domain` | Use case handlers, commands, application services |
| `Portfolio.Domain` | (nothing) | Value objects, entities, domain rules |
| `Portfolio.Infrastructure` | `Application`, `Domain` | External integrations (email, storage), config |

Dependency direction flows inward. `Domain` knows nothing about anything else. This is the line that lets you replace email providers without touching the domain.

## Minimum-viable example: send a contact message

### Domain layer

```csharp
// Portfolio.Domain/Contact/ContactMessage.cs
namespace Portfolio.Domain.Contact;

public sealed record ContactMessage
{
    public EmailAddress Sender { get; }
    public string Body { get; }
    public DateTimeOffset SentAt { get; }

    private ContactMessage(EmailAddress sender, string body, DateTimeOffset sentAt)
    {
        Sender = sender;
        Body = body;
        SentAt = sentAt;
    }

    public static ContactMessage Create(string senderEmail, string body, DateTimeOffset sentAt)
    {
        var email = EmailAddress.Create(senderEmail);
        if (string.IsNullOrWhiteSpace(body))
            throw new DomainException("Message body cannot be empty.");
        if (body.Length > 5000)
            throw new DomainException("Message body exceeds 5000 characters.");
        return new ContactMessage(email, body.Trim(), sentAt);
    }
}
```

```csharp
// Portfolio.Domain/Common/EmailAddress.cs
public sealed record EmailAddress
{
    public string Value { get; }
    private EmailAddress(string value) => Value = value;

    public static EmailAddress Create(string raw)
    {
        if (!System.Net.Mail.MailAddress.TryCreate(raw, out _))
            throw new DomainException("Invalid email address.");
        return new EmailAddress(raw.ToLowerInvariant());
    }
}
```

### Application layer

```csharp
// Portfolio.Application/Contact/Commands/SendContactMessageCommand.cs
public sealed record SendContactMessageCommand(string SenderEmail, string Body);
```

```csharp
// Portfolio.Application/Abstractions/IEmailSender.cs
public interface IEmailSender
{
    Task SendAsync(ContactMessage message, CancellationToken ct);
}
```

```csharp
// Portfolio.Application/Contact/Handlers/SendContactMessageHandler.cs
public sealed class SendContactMessageHandler(IEmailSender emailSender, TimeProvider clock)
{
    public async Task HandleAsync(SendContactMessageCommand cmd, CancellationToken ct)
    {
        var message = ContactMessage.Create(cmd.SenderEmail, cmd.Body, clock.GetUtcNow());
        await emailSender.SendAsync(message, ct);
    }
}
```

### Infrastructure layer

```csharp
// Portfolio.Infrastructure/Email/ResendEmailSender.cs
public sealed class ResendEmailSender(HttpClient http, IOptions<ResendOptions> opts, ILogger<ResendEmailSender> log) : IEmailSender
{
    public async Task SendAsync(ContactMessage message, CancellationToken ct)
    {
        var payload = new {
            from = opts.Value.FromAddress,
            to = new[] { opts.Value.DestinationEmail },
            subject = $"depthfolio · contact from {message.Sender.Value}",
            text = message.Body,
            reply_to = message.Sender.Value,
        };
        var response = await http.PostAsJsonAsync("https://api.resend.com/emails", payload, ct);
        response.EnsureSuccessStatusCode();
    }
}
```

### Api layer (Function)

```csharp
// Portfolio.Api/Functions/ContactFunction.cs
public sealed class ContactFunction(SendContactMessageHandler handler, ILogger<ContactFunction> log)
{
    public sealed record ContactRequest(string Email, string Message);

    [Function(nameof(SendContact))]
    public async Task<HttpResponseData> SendContact(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "contact")] HttpRequestData req,
        CancellationToken ct)
    {
        var body = await req.ReadFromJsonAsync<ContactRequest>(cancellationToken: ct);
        if (body is null) return req.CreateResponse(HttpStatusCode.BadRequest);

        try
        {
            await handler.HandleAsync(new SendContactMessageCommand(body.Email, body.Message), ct);
            return req.CreateResponse(HttpStatusCode.Accepted);
        }
        catch (DomainException ex)
        {
            log.LogWarning(ex, "Contact validation failed");
            var resp = req.CreateResponse(HttpStatusCode.BadRequest);
            await resp.WriteAsJsonAsync(new { error = ex.Message }, ct);
            return resp;
        }
    }
}
```

### DI composition (Program.cs)

```csharp
// Portfolio.Api/Program.cs
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((ctx, services) =>
    {
        services.AddSingleton(TimeProvider.System);
        services.AddOptions<ResendOptions>().Bind(ctx.Configuration.GetSection("Resend"));
        services.AddOptions<ContactOptions>().Bind(ctx.Configuration.GetSection("Contact"));
        services.AddHttpClient<IEmailSender, ResendEmailSender>(c =>
        {
            c.DefaultRequestHeaders.Authorization =
                new("Bearer", ctx.Configuration["Resend:ApiKey"]);
        });
        services.AddScoped<SendContactMessageHandler>();
    })
    .Build();

await host.RunAsync();
```

## Testing the domain in isolation

Domain tests need no infrastructure, no mocks, no DI:

```csharp
[Fact]
public void Create_rejects_empty_body()
{
    var act = () => ContactMessage.Create("a@b.com", "  ", DateTimeOffset.UtcNow);
    Assert.Throws<DomainException>(act);
}
```

That's the point of Clean Architecture — these tests run in milliseconds, locally, with zero ceremony.

## Gotchas

- **`HttpRequestData.ReadFromJsonAsync<T>()` returns null** if the body can't be deserialised, doesn't throw. Always null-check.
- **Don't validate in the Function (Api layer).** Validation belongs to the domain. The Function just translates HTTP into commands.
- **Use `TimeProvider` not `DateTime.UtcNow`** so tests can control time.
- **Project references in `.csproj` enforce the dependency direction** — set them up once and don't break the rule. A future ArchUnit test can enforce this programmatically.
- **Isolated worker has a cold-start cost** of ~1s. Acceptable here because the contact form is called once per visitor at most. If it weren't, you'd consider keeping the Function warm or pre-rendering the form action.
- **Bind options at startup**, not per-request. `IOptions<T>` is a singleton.

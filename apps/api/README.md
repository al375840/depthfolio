# apps/api — depthfolio backend

Azure Functions, .NET 8 isolated worker, Clean Architecture across four projects.

## Local development

> The actual .NET project files are added in a follow-up commit. This README documents the intended layout and commands.

```bash
cd apps/api/src/Portfolio.Api
func start             # Azure Functions Core Tools, local host on port 7071
dotnet test            # runs all tests under apps/api/tests
```

## Project layout

```
src/
├── Portfolio.Api/                  # Functions entry point, HTTP triggers, DTOs
│   └── Functions/
│       └── ContactFunction.cs
├── Portfolio.Application/          # use case handlers, application services
│   ├── Abstractions/
│   └── Contact/
│       ├── Commands/
│       └── Handlers/
├── Portfolio.Domain/               # pure domain: value objects, invariants
│   ├── Common/
│   └── Contact/
└── Portfolio.Infrastructure/       # external concerns: email, config
    ├── Email/
    └── Configuration/

tests/
├── Portfolio.Domain.Tests/
└── Portfolio.Application.Tests/
```

## Dependency rules

- `Api` references `Application` and `Infrastructure`.
- `Application` references `Domain` only.
- `Infrastructure` references `Application` and `Domain`.
- `Domain` references nothing.

Enforced manually in `.csproj` files. A future enhancement could enforce this with an ArchUnit-style test.

## Local settings

`local.settings.json` lives in `Portfolio.Api/` and is gitignored. Template (do not commit real values):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "Resend__ApiKey": "re_xxx_placeholder",
    "Contact__DestinationEmail": "sympoleon@gmail.com",
    "Contact__FromAddress": "noreply@depthfolio.dev"
  }
}
```

In production, these values come from Azure Application Settings on the Static Web App resource.

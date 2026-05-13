# CLAUDE.md

This file orients Claude Code (or any AI coding assistant) when it opens this repository. Read this before touching anything.

## Project at a glance

**depthfolio** — Adrián León's personal portfolio. The centrepiece is a real-time depth map generated from the visitor's webcam, with clickable hotspots overlaid on different regions. Should look 3D but does NOT need an actual 3D model — it uses a depth-displacement plane in Three.js for fake-3D parallax. Fully browser-side ML (ONNX Runtime Web + MiDaS-small). Backend is a single .NET 8 Azure Function for the contact form.

Author profile: Senior .NET backend developer with Angular experience on the frontend.

## Working agreement

- **Language**: respond in Spanish, keep code identifiers and comments in English.
- **Tone**: relaxed mentor, technical, constructive. No "informatics" jokes.
- **Style**: explain the why, not just the what. Critique code constructively. Flag security, performance, anti-patterns proactively.
- **Architecture defaults**: Clean Architecture + DDD on the .NET side. Angular standalone + signals on the frontend.

## Source of truth

Read these before making decisions:

1. [README.md](./README.md) — what the project is and stack.
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — the architectural narrative and rationale.
3. [docs/adr/](./docs/adr/) — the Architecture Decision Records that lock in specific choices (stack, accent colour oxblood, monorepo style, ML in browser, camera fallback).
4. [.skills/](./.skills/) — five concentrated knowledge bundles, one per technical domain in this project. When working on browser ML, Three.js, Angular layout, Functions or deployment, read the relevant `SKILL.md` first.

## Stack quick reference

| Layer | Choice |
|---|---|
| Frontend | Angular 17+ standalone, signals, deferrable views |
| Styling | Tailwind CSS, oxblood accent (#A8324A) — see ADR 0002 |
| 3D | Three.js (vanilla, framework-agnostic inside `features/depth-scene/three/`) |
| ML | ONNX Runtime Web with WebGPU/WASM fallback, MiDaS-small model |
| Backend | Azure Functions .NET 8 isolated, Clean Architecture (4 projects) |
| Email | Resend |
| Hosting | Azure Static Web Apps (Hobby tier, free) |
| CI/CD | GitHub Actions, official Azure SWA workflow |

## Repo layout

```
depthfolio/
├── apps/
│   ├── web/                 # Angular app (scaffold not yet created)
│   └── api/                 # Azure Functions .NET 8 (scaffold not yet created)
├── docs/                    # Architecture and ADRs
├── .skills/                 # 5 internal knowledge bundles
├── .claude/
│   └── skills/              # External skills cloned via tools/setup-skills
└── tools/                   # Bootstrap scripts (git history, skills install)
```

## Not yet built (current state)

The structure is in place but the actual application code is NOT scaffolded yet. Specifically:

- `apps/web` has the folder skeleton with `.gitkeep` files but no Angular project. To scaffold: run `ng new` inside `apps/web` with standalone components, signals, routing, and SSR disabled.
- `apps/api` has the four-project layout planned but no `.csproj` or `.sln` files. To scaffold: create the four .NET 8 class libraries + the Functions worker project per ADR 0003 and the skill `azure-functions-cleanarch`.
- `.github/workflows` is empty. Workflow YAML is added when the Azure Static Web Apps resource is provisioned and linked to the repo.

## Conventions

- **Commits**: Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`). One narrative per commit.
- **Feature isolation**: a feature module never imports from another feature module. Cross-cutting concerns go through `core/` or `shared/`.
- **Framework-agnostic boundary**: code under `features/depth-scene/three/` and `features/depth-scene/ml/` must not import from `@angular/*`.
- **Background colour**: page background is `#FAFAFA`, never `#FFFFFF` pure. WCAG-tested accent on this background.

## Setup checklist for new contributors

1. Clone the repo, then run `tools/setup-git-history.sh` (or `.ps1`) **only on a freshly initialised tree** to set up the commit narrative.
2. Run `tools/setup-skills.sh` (or `.ps1`) to clone the external design skills (`emil-design-eng`, `ui-ux-pro-max`) into `.claude/skills/`.
3. Read `docs/ARCHITECTURE.md` and the five files under `.skills/`.
4. Scaffold `apps/web` and `apps/api` per the documented structure.

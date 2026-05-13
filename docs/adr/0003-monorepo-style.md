# ADR 0003 — Monorepo style (without a monorepo tool)

**Date**: 2026-05-12
**Status**: Accepted

## Context

The project has two deployable artefacts:

- `apps/web` — Angular 17 single-page application.
- `apps/api` — Azure Functions .NET 8.

Three options:

1. Two separate repos.
2. Single repo, monorepo tooling (Nx, Turborepo, Lerna).
3. Single repo, plain layout, no tooling.

## Decision

**Single repo, plain `apps/web` + `apps/api` layout, no monorepo tooling.**

Justification:

- Two repos would force cross-repo coordination of API contract changes and double the CI pipelines for negligible gain at this size.
- Nx would add ~30 MB of tooling and conceptual overhead for a project with two apps and zero shared libraries.
- The plain layout still tells the "two deployables versioned together" story and migrates trivially to Nx later if a third app or shared lib appears.

The `staticwebapp.config.json` lives at the repo root, since Azure Static Web Apps' GitHub Action expects it there.

## Consequences

**Positive**: minimal cognitive overhead, single `git clone`, single CI workflow, atomic cross-stack commits.

**Negative**: no shared TypeScript types between Angular form and Function contract. Mitigated by keeping the contract trivially small (one DTO with three fields). If the contract grows, revisit and consider extracting a `libs/contracts` shared package.

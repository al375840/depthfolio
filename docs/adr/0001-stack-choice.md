# ADR 0001 — Stack choice

**Date**: 2026-05-12
**Status**: Accepted

## Context

depthfolio is a portfolio project for a Senior .NET backend developer with Angular experience on the frontend. It needs to ship as a public, polished, hireable artefact — not as an experiment. The centrepiece is a real-time depth-map visualisation driven by the visitor's webcam, with clickable hotspots routing to portfolio sections.

Two competing forces shape the decision:

- **Demonstrate technical breadth** (ML in browser, WebGL/GLSL, modern web, clean backend).
- **Ship in weeks, not months.** A half-finished portfolio is worse than a smaller, finished one.

## Decision

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | Angular 17+ standalone | Author's strongest framework. Modern Angular (signals, deferrable views, control flow) is genuinely competitive with React/Solid for this use case. Avoids a parallel learning project. |
| 3D rendering | Three.js direct | Largest ecosystem, no framework wrapper overhead. Code is isolated in `features/depth-scene/three/` so it's framework-agnostic and portable. |
| ML inference | ONNX Runtime Web | More active development than TensorFlow.js. First-class WebGPU support with WASM fallback. Models from Hugging Face convert to ONNX trivially. |
| Depth model | MiDaS-small (start) | Smallest viable monocular depth model (~25 MB). Adequate quality for portfolio use. Upgrade path to Depth-Anything-V2-Small if performance allows. |
| Backend | Azure Functions .NET 8 isolated | Matches author's primary stack. Free tier is generous. Cold start (~1s) is acceptable for a once-per-visitor contact form. |
| Hosting | Azure Static Web Apps | Coherent narrative with .NET. Free Hobby tier includes global CDN, custom domain, HTTPS, integrated Functions, GitHub Actions CI/CD. Supports `COOP`/`COEP` headers required for WebGPU. |
| Email | Resend | Free tier (3k emails/month). Better DX than SendGrid. |
| Styling | Tailwind CSS | Fast iteration. Pairs naturally with the design-token approach for the oxblood accent system. |

## Consequences

**Positive**: Internally coherent stack. Free tier covers everything. Familiar primary tools mean faster shipping. Tells a clear story to .NET-stack recruiters.

**Negative**: Misses the opportunity to demonstrate React/Vue/Svelte. Mitigated by the plan to ship one or two later projects using a different frontend.

**Risk**: Browser-side ML may not perform acceptably on low-end devices. Mitigated by the fallback strategy (see ADR 0004).

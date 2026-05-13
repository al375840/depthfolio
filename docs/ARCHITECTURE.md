# Architecture

This document describes the runtime architecture, the design rationale behind it, and how the pieces fit together. For point-in-time decisions, see the `adr/` folder (Architecture Decision Records).

## Guiding principles

1. **Move compute to the client.** The browser is a capable runtime. Real-time depth estimation and WebGL rendering both belong in the user's GPU, not on a server we pay for.
2. **Separate framework code from domain code.** Three.js scene assembly and ONNX model handling are pure TypeScript inside `features/depth-scene/three/` and `features/depth-scene/ml/`. Angular owns the UI shell, nothing else.
3. **Clean Architecture even when it feels excessive.** The Azure Function has one endpoint. It still has four layers. Habits compound.
4. **One narrative per commit.** Each commit answers one question and could be reverted independently. Conventional Commits.

## Runtime architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Visitor's browser (everything runs here)            │
│                                                                            │
│   ┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│   │ Webcam API │ → │ ONNX Runtime │ → │ Three.js     │ → │ Angular UI │ │
│   │ MediaStream│   │ MiDaS-small  │   │ Displacement │   │ Hotspots   │ │
│   │ ~30 fps    │   │ WebGPU/WASM  │   │ plane shader │   │ Routing    │ │
│   └────────────┘   └──────────────┘   └──────────────┘   └────────────┘ │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
        │                                                          │
        │  GET html/js/onnx (CDN)                POST /api/contact │
        ▼                                                          ▼
┌────────────────────────────┐                ┌────────────────────────────┐
│  Azure Static Web Apps     │                │  Azure Functions API       │
│  Hobby tier (free)         │                │  .NET 8 isolated worker    │
│  Global CDN · HTTPS        │                │  Clean Architecture        │
│  COOP/COEP headers         │                │  ┌────┬────┬────┬────────┐│
│  SPA fallback              │                │  │Api │App │Dom │ Infra  ││
│  Long-cache for .onnx      │                │  └────┴────┴────┴────────┘│
└────────────────────────────┘                └────────────────────────────┘
                                                              │
                                                              │ send email
                                                              ▼
                                                       ┌──────────────┐
                                                       │   Resend     │
                                                       │ free 3k/mo   │
                                                       └──────────────┘
```

## The depth-scene pipeline

The core technical piece is the loop that turns a webcam frame into a 3D-looking image.

**Per frame** (target 30 fps when the model can keep up, 15 fps otherwise):

1. Grab the latest webcam frame into an `OffscreenCanvas`.
2. Preprocess: resize to the model's expected input (e.g. 256x256 for MiDaS-small), normalise pixel values to the model's expected range, transpose CHW.
3. Feed into the ONNX session running on a Web Worker. Inference returns a depth tensor of shape `[1, 1, H, W]` with float32 distances.
4. Post-process the depth tensor into a luminance texture (clamp, normalise to 0–1, optional bilateral filter for smoothing).
5. Upload both the webcam frame (as `THREE.VideoTexture` or `CanvasTexture`) and the depth texture into the GPU.
6. Three.js renders a `PlaneGeometry` with high subdivision count. A custom vertex shader displaces each vertex in the Z axis by `texture2D(depthMap, uv).r * displacementScale`. The fragment shader samples the webcam texture.
7. A subtle parallax is applied: the `OrthographicCamera` (or a `PerspectiveCamera` with low FOV) shifts position based on mouse coordinates, producing the illusion of depth.
8. Hotspot meshes (`Sprite` or planar `Mesh` with `THREE.MeshBasicMaterial`) are positioned in world space at calibrated offsets. A `Raycaster` handles click detection.

**Critical decoupling**: the worker running ONNX talks to the main thread via `SharedArrayBuffer` to avoid copying the depth tensor on each frame. This is why the deployed site needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers.

## Frontend layering (apps/web)

```
src/app/
├── core/         singletons: services, interceptors, guards, tokens
├── shared/       reusable: pipes, directives, generic components
├── features/     bounded contexts: depth-scene, about, projects, experience, contact
└── layout/       application shell: header, footer, page chrome
```

**Rule**: a feature module never imports from another feature module. Cross-cutting needs go through `core/` or `shared/`. This keeps the dependency graph acyclic and the lazy-loading boundaries clean.

Within `features/depth-scene/`, the `three/` and `ml/` subfolders contain framework-agnostic TypeScript. They could be lifted into any other framework without changes — that's the test.

## Backend layering (apps/api)

Four projects, even for one endpoint:

| Project | Responsibility |
|---|---|
| `Portfolio.Api` | Azure Functions entry points, HTTP triggers, request/response DTOs |
| `Portfolio.Application` | Use case handlers, command/query models, application services |
| `Portfolio.Domain` | Pure domain: value objects (`EmailAddress`, `ContactMessage`), invariants |
| `Portfolio.Infrastructure` | External concerns: Resend email client, configuration |

Dependencies flow inward only: Api → Application → Domain, and Infrastructure → Application/Domain. No project references Application backwards.

## Internationalisation

Built with `@angular/localize` (compile-time, SEO-friendly), serving two locales: `es` (default) and `en`. Locale switching reloads the document so search engines can index both versions independently at `depthfolio.dev/es/` and `depthfolio.dev/en/`.

## Deployment

A single GitHub Actions workflow drives the entire deployment:

1. On push to `main`, GitHub Actions checks out the repo.
2. The official `Azure/static-web-apps-deploy@v1` action receives `app_location: apps/web`, `api_location: apps/api/src/Portfolio.Api`, `output_location: dist/web/browser`.
3. The action builds Angular, builds the Functions app, and uploads both as a single atomic deployment to Azure Static Web Apps.
4. Pull requests get ephemeral preview environments at `<branch>.azurestaticapps.net`.

The `staticwebapp.config.json` at the repo root configures SPA fallback (any non-API route returns `index.html`), custom security headers (CSP, COOP, COEP), and cache rules (`.onnx` files cached for 1 year, immutable).

## Observability

Out of scope for the first version. If added later, [Plausible](https://plausible.io/) is the preferred choice for privacy-friendly analytics, embedded as a single script tag — no cookies, no consent banner needed in the EU.

## Knowledge skills

The `.skills/` folder contains five concentrated knowledge bundles, one per technical domain in this project. They're written as if explaining the topic to a future version of the author who has forgotten the specifics. See [`.skills/README.md`](../.skills/README.md) for the index.

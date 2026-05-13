# depthfolio

A real-time, browser-side depth map portfolio. Open it, grant camera access, and a depth estimation model runs locally in your browser to turn your webcam feed into a 3D-looking scene with clickable hotspots that navigate to portfolio sections.

No server-side inference. No backend for the experience. The entire ML and rendering pipeline lives in the visitor's browser; the only cloud component is a single .NET Azure Function for the contact form.

## What this project demonstrates

- Real-time monocular depth estimation in the browser via [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) with WebGPU acceleration.
- Custom GLSL vertex shader doing displacement-plane rendering through [Three.js](https://threejs.org/) — fake 3D from a 2D plane plus a depth texture.
- Modern Angular (v17+ standalone components, signals, deferrable views, new control flow).
- Clean Architecture applied to a single-endpoint Azure Function (.NET 8 isolated worker) — yes, even for one endpoint, because architecture habits compound.
- Bilingual UI (Spanish / English) with runtime switching.
- Atomic, narrated commit history following Conventional Commits.

## Stack at a glance

| Layer | Technology |
|---|---|
| Frontend framework | Angular 17+ (standalone, signals) |
| Styling | Tailwind CSS with oxblood accent palette |
| 3D rendering | Three.js (vanilla, framework-agnostic) |
| ML inference | ONNX Runtime Web (WebGPU → WASM fallback) |
| Depth model | MiDaS-small (~25 MB) — upgradable to Depth-Anything-V2-Small |
| Backend | Azure Functions .NET 8 isolated worker, Clean Architecture |
| Email delivery | Resend |
| Hosting | Azure Static Web Apps (Hobby tier) |
| CI/CD | GitHub Actions (official Azure SWA workflow) |

## Repository layout

```
depthfolio/
├── apps/
│   ├── web/                 # Angular 17 application
│   └── api/                 # Azure Functions .NET 8 (Clean Architecture)
├── docs/
│   ├── ARCHITECTURE.md      # High-level architecture and rationale
│   └── adr/                 # Architecture Decision Records
├── .skills/                 # Reusable knowledge bundles per domain
└── .github/
    └── workflows/           # CI/CD pipelines
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full architectural narrative.

## Running locally

The full local-dev instructions live inside each app:

- Frontend: see [`apps/web/README.md`](./apps/web/README.md)
- Backend: see [`apps/api/README.md`](./apps/api/README.md)

## Author

**Adrián León** — Senior .NET backend developer building this as a portfolio piece.

- Email: contact form on the deployed site
- Mirror: this repository

## License

[MIT](./LICENSE).

# ADR 0004 — ML inference in the browser, not on a server

**Date**: 2026-05-12
**Status**: Accepted

## Context

Generating the depth map from each webcam frame requires running a monocular depth estimation model. The model can run in two places:

1. **Server-side**: visitor's browser uploads frames, a server (or serverless GPU) runs inference and returns depth maps.
2. **Browser-side**: the model runs locally in the visitor's browser, using their CPU or GPU.

## Decision

**Browser-side, via ONNX Runtime Web with WebGPU acceleration.**

Reasoning:

- **Cost**: server-side inference at 30 fps for any concurrent visitors quickly becomes a paid GPU bill. Browser-side is exactly zero.
- **Latency**: round-tripping every frame to a server kills the interactivity. The depth map needs to be on-screen within ~33 ms of the camera frame for a 30 fps feel.
- **Privacy**: webcam frames never leave the visitor's device. This is a non-trivial trust signal for a portfolio aimed at hiring managers.
- **Technical signal**: running production-grade ML in a browser is a stronger flex than wiring up a hosted GPU.

## Tradeoffs

**Low-end devices**: visitors on integrated GPUs from before ~2020 may see degraded frame rates. Mitigation in ADR 0005: a static fallback image with pre-computed depth map preserves the 3D experience without live inference.

**Permission UX**: the visitor must grant camera access. The fallback path covers refusals.

**Model size**: MiDaS-small is ~25 MB. We cache it aggressively (1 year, immutable) via Azure SWA cache rules. First-visit cost ~3 s on a fast connection; revisits are instant.

## Implementation notes

- ONNX session runs in a Web Worker, not on the main thread.
- Depth tensor transferred via `SharedArrayBuffer` to avoid per-frame copies. This requires the response headers `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, configured in `staticwebapp.config.json`.
- Execution provider chain: `['webgpu', 'wasm']` — falls back automatically.

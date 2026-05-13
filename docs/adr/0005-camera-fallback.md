# ADR 0005 — Camera permission and device fallback

**Date**: 2026-05-12
**Status**: Accepted

## Context

The hero experience depends on the visitor's webcam. Three scenarios degrade or remove that input:

1. The visitor denies camera permission.
2. The device has no webcam (some desktops, kiosks).
3. The device hardware can't run depth inference at a usable frame rate (very old GPUs, low-power tablets).

A portfolio that breaks on any of these scenarios loses visitors at the front door.

## Decision

**Single, unified fallback**: a static portrait of Adrián with a pre-computed depth map, rendered by the same Three.js displacement pipeline.

When the live pipeline cannot run, we swap in two image textures (portrait + depth) and disable the per-frame inference loop. Everything else — hotspots, parallax on mouse move, navigation — works identically.

Detection logic, in priority order:

1. If `navigator.mediaDevices.getUserMedia` rejects or is unavailable → fallback.
2. If a benchmark inference (single frame on app load) takes >250 ms → fallback.
3. If three consecutive frames fail to meet a 15 fps threshold → fallback at runtime, with a soft transition.

The fallback texture pair lives at `apps/web/public/fallback/portrait.jpg` and `apps/web/public/fallback/portrait-depth.png`. Generated offline once using Depth-Anything-V2-Large (highest quality, no runtime cost) on a portrait photo.

## Consequences

**Single code path**: the Three.js scene is agnostic about whether the textures come from the live pipeline or static files. This is design leverage.

**Asset prep**: requires one offline ML step before deployment. Documented in `.skills/browser-ml/SKILL.md`.

**UX**: the visitor never sees a broken state. A small badge ("static demo") appears top-left when fallback is active, so the experience is honest about what's running.

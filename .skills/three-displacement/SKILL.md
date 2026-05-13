---
name: three-displacement
description: Render a fake-3D image from a 2D photo plus its depth map, using a Three.js PlaneGeometry and a custom GLSL vertex shader that displaces vertices in Z by the depth value. Covers parallax with mouse, hotspot raycasting, and shader gotchas.
---

# Three.js depth-displacement rendering

## What and why

A 2D image plus a per-pixel depth map can be rendered as a 3D scene by:

1. Building a flat mesh (`PlaneGeometry`) with many subdivisions (e.g. 128x128 = 16,384 vertices).
2. Texturing the plane with the colour image.
3. Writing a vertex shader that pushes each vertex along Z by `depthMap.sample(uv).r * scale`.
4. Slightly moving the camera in response to mouse coordinates, producing parallax.

The result feels 3D without any 3D modelling. Used by Facebook's "3D photos" and a lot of WebGL portfolios.

## Minimum-viable scene

```typescript
import * as THREE from 'three';

export function buildDepthScene(
  container: HTMLElement,
  colorTexture: THREE.Texture,
  depthTexture: THREE.Texture,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 4;

  const scene = new THREE.Scene();

  const geometry = new THREE.PlaneGeometry(3, 2.25, 128, 96); // aspect 4:3
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: colorTexture },
      uDepth: { value: depthTexture },
      uDisplacement: { value: 0.35 }, // tune by eye
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  return { renderer, scene, camera, plane };
}
```

## Vertex shader

```glsl
// vertex.glsl
uniform sampler2D uDepth;
uniform float uDisplacement;
varying vec2 vUv;

void main() {
  vUv = uv;
  float depth = texture2D(uDepth, uv).r;
  vec3 displaced = position;
  displaced.z += depth * uDisplacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

## Fragment shader

```glsl
// fragment.glsl
uniform sampler2D uColor;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uColor, vUv);
}
```

## Parallax with mouse

```typescript
let mouseX = 0, mouseY = 0;
container.addEventListener('mousemove', (e) => {
  const rect = container.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1..1
  mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
});

function animate() {
  // Lerp toward target for smooth motion.
  camera.position.x += (mouseX * 0.3 - camera.position.x) * 0.08;
  camera.position.y += (-mouseY * 0.2 - camera.position.y) * 0.08;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
```

The `0.08` factor controls "stiffness" — lower is smoother, higher is more reactive.

## Hotspots and raycasting

Hotspots can be:

- **DOM overlay** (absolute-positioned divs over the canvas): simpler, accessible, but doesn't parallax with the scene.
- **Three.js Sprite/Mesh** in the scene: integrated, moves with the parallax. Use `THREE.Raycaster` for click detection.

```typescript
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hotspotMeshes);
  if (intersects.length) {
    const hotspot = intersects[0].object;
    onHotspotClick(hotspot.userData.routeTo);
  }
});
```

## Updating the depth texture every frame

When the depth comes from live inference, the texture must be re-uploaded each frame. Use `THREE.DataTexture` for direct GPU upload from a Float32Array:

```typescript
const depthDataTexture = new THREE.DataTexture(
  new Float32Array(256 * 256), 256, 256,
  THREE.RedFormat, THREE.FloatType,
);
depthDataTexture.needsUpdate = true;

// Each frame, after inference:
depthDataTexture.image.data.set(newDepthArray);
depthDataTexture.needsUpdate = true;
```

## Gotchas

- **Set `geometry` subdivisions high enough** or the displacement looks faceted. 128x96 is a reasonable starting point; below 64 looks bad.
- **Depth maps must be normalised per-frame** (especially MiDaS, which outputs relative inverse depth that drifts). Compute min/max and normalise before uploading.
- **`THREE.FloatType` requires the `OES_texture_float` extension** — universal on modern browsers, but check support if targeting old hardware. Fallback to `THREE.UnsignedByteType` and 8-bit depth.
- **Dispose properly.** Each `Texture`, `Material`, `Geometry`, `WebGLRenderer` has a `.dispose()` method. Memory leaks compound brutally if you re-create the scene on hot reload without disposing.
- **Z-fighting on hotspots**: position them at `z = displacement_scale + epsilon` so they sit slightly above the deepest displaced vertex.
- **Antialiasing on a displaced plane has visible edges** at the silhouette. If it bothers you, render to a render target and apply FXAA in post.

## Optimisations

- Use `OffscreenCanvas` for the renderer if you're already on a worker.
- Lower the geometry subdivision when the user is not interacting (idle detection).
- Pause `requestAnimationFrame` when the tab is hidden via `document.visibilityState`.

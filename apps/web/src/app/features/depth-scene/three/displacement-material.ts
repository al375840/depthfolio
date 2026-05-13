import * as THREE from 'three';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders';

export function createDisplacementMaterial(
  colorTexture: THREE.Texture,
  depthTexture: THREE.DataTexture,
  // Larger value = subject pops out more dramatically. The plane sits at z=0
  // so peaks reach z = displacementScale and feel like they leave the page.
  displacementScale = 0.7,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor:        { value: colorTexture },
      uDepth:        { value: depthTexture },
      uDisplacement: { value: displacementScale },
      // Default to the monochrome depth view — the colour feed reads as a
      // toggle for "show me what the camera actually sees".
      uShowDepth:    { value: 1.0 },
    },
    vertexShader:   VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
}

export function createDepthDataTexture(width = 256, height = 256): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Float32Array(width * height),
    width,
    height,
    THREE.RedFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;
  return texture;
}

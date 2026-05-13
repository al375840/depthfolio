import * as THREE from 'three';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders';

export function createDisplacementMaterial(
  colorTexture: THREE.Texture,
  depthTexture: THREE.DataTexture,
  displacementScale = 0.35,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor:       { value: colorTexture },
      uDepth:       { value: depthTexture },
      uDisplacement:{ value: displacementScale },
      uShowDepth:   { value: 0.0 },
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

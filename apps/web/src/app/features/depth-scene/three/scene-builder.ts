import * as THREE from 'three';
import { createDisplacementMaterial, createDepthDataTexture } from './displacement-material';

export interface DepthSceneObjects {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  depthTexture: THREE.DataTexture;
  dispose(): void;
}

export function buildDepthScene(
  canvas: HTMLCanvasElement,
  colorTexture: THREE.Texture,
): DepthSceneObjects {
  const { clientWidth: w, clientHeight: h } = canvas;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
  camera.position.z = 4;

  const scene = new THREE.Scene();

  const depthTexture = createDepthDataTexture();
  const geometry = new THREE.PlaneGeometry(3, 2.25, 128, 96);
  const material = createDisplacementMaterial(colorTexture, depthTexture);
  scene.add(new THREE.Mesh(geometry, material));

  function dispose() {
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    depthTexture.dispose();
    colorTexture.dispose();
  }

  return { renderer, scene, camera, depthTexture, dispose };
}

export function updateParallax(
  camera: THREE.PerspectiveCamera,
  mouseX: number,
  mouseY: number,
): void {
  camera.position.x += (mouseX * 0.3 - camera.position.x) * 0.08;
  camera.position.y += (-mouseY * 0.2 - camera.position.y) * 0.08;
  camera.lookAt(0, 0, 0);
}

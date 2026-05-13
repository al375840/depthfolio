import * as THREE from 'three';
import { createDisplacementMaterial, createDepthDataTexture } from './displacement-material';
import { createHotspots, disposeHotspots, hitTestHotspots, type Hotspot } from './hotspots';

export interface DepthSceneObjects {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  depthTexture: THREE.DataTexture;
  hotspots: Hotspot[];
  hitTest(pointer: THREE.Vector2): string | null;
  setShowDepth(value: number): void;
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

  const hotspots = createHotspots(scene);

  function hitTest(pointer: THREE.Vector2): string | null {
    return hitTestHotspots(hotspots, pointer, camera);
  }

  function setShowDepth(value: number): void {
    (material.uniforms['uShowDepth'] as THREE.IUniform<number>).value = value;
  }

  function dispose() {
    disposeHotspots(hotspots);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    depthTexture.dispose();
    colorTexture.dispose();
  }

  return { renderer, scene, camera, depthTexture, hotspots, hitTest, setShowDepth, dispose };
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

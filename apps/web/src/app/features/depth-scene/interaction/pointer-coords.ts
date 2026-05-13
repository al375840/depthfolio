import * as THREE from 'three';

/**
 * Normalised Device Coordinates: a square -1..1 box where (0,0) is the centre
 * of the canvas, X grows right, Y grows UP (opposite of CSS).
 * Three.js's raycaster expects pointer input in this space.
 */
export interface PointerNdc {
  x: number;
  y: number;
}

/** Convert a DOM mouse event into NDC, relative to its currentTarget element. */
export function mouseEventToNdc(e: MouseEvent): PointerNdc {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return {
    x:  ((e.clientX - rect.left) / rect.width)  * 2 - 1,
    y: -((e.clientY - rect.top)  / rect.height) * 2 + 1,
  };
}

/**
 * Convert a hand-detector point (0..1 normalised image coords, Y-down) into NDC.
 * MediaPipe gives us (0,0)=top-left and (1,1)=bottom-right; NDC wants Y inverted.
 */
export function handPointToNdc(pt: { x: number; y: number }): PointerNdc {
  return {
    x:  pt.x * 2 - 1,
    y: -(pt.y * 2 - 1),
  };
}

/** Pack an NDC point into a THREE.Vector2 for the raycaster. */
export function ndcToVector(ndc: PointerNdc): THREE.Vector2 {
  return new THREE.Vector2(ndc.x, ndc.y);
}

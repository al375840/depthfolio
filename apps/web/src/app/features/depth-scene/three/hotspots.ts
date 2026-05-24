import * as THREE from 'three';

export interface HotspotDef {
  label: string;
  x: number;
  y: number;
  route: string;
}

export interface Hotspot {
  sprite: THREE.Sprite;
  route: string;
}

const HOTSPOT_DEFS: HotspotDef[] = [
  { label: 'About',      x: -0.85,  y:  0.55, route: '/about'      },
  { label: 'Projects',   x:  0.85,  y:  0.55, route: '/projects'   },
  { label: 'Experience', x: -0.85,  y: -0.55, route: '/experience' },
  { label: 'Contact',    x:  0.55,  y: -0.55, route: '/contact'    },
];

function makeHotspotTexture(label: string): THREE.CanvasTexture {
  const W = 192;
  const H = 56;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // pill background — oxblood semi-transparent
  ctx.fillStyle = 'rgba(168, 50, 74, 0.82)';
  ctx.beginPath();
  const r = H / 2;
  ctx.moveTo(r, 0);
  ctx.lineTo(W - r, 0);
  ctx.arc(W - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, H);
  ctx.arc(r, r, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
  ctx.fill();

  // subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // label text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, W / 2, H / 2);

  return new THREE.CanvasTexture(canvas);
}

export function createHotspots(scene: THREE.Scene): Hotspot[] {
  return HOTSPOT_DEFS.map(({ label, x, y, route }) => {
    const texture = makeHotspotTexture(label);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(material);
    // z = 0.45 places the sprite just above the max displaced vertex (scale 0.35)
    sprite.position.set(x, y, 0.45);
    sprite.scale.set(0.65, 0.19, 1);
    sprite.userData = { route };
    scene.add(sprite);
    return { sprite, route };
  });
}

export function hitTestHotspots(
  hotspots: Hotspot[],
  pointer: THREE.Vector2,
  camera: THREE.Camera,
): string | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const sprites = hotspots.map(h => h.sprite);
  const intersects = raycaster.intersectObjects(sprites);
  if (intersects.length > 0) {
    return intersects[0].object.userData['route'] as string;
  }
  return null;
}

export function disposeHotspots(hotspots: Hotspot[]): void {
  hotspots.forEach(({ sprite }) => {
    (sprite.material as THREE.SpriteMaterial).map?.dispose();
    sprite.material.dispose();
  });
}

// The X axis of every texture sampling is flipped so the rendered image
// reads like a mirror — moving your right hand right also moves the
// reflection right, which matches everyone's intuition.
export const VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uDisplacement;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec2 mirroredUv = vec2(1.0 - uv.x, uv.y);
    float depth = texture2D(uDepth, mirroredUv).r;
    vec3 displaced = position;
    displaced.z += depth * uDisplacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform float uShowDepth; // 0.0 = color image, 1.0 = depth heatmap

  varying vec2 vUv;

  void main() {
    vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);
    vec4 color = texture2D(uColor, mirroredUv);
    float depth = texture2D(uDepth, mirroredUv).r;
    // near=white (1.0), far=black (0.0) — monochrome depth view
    vec3 grey = vec3(depth);
    gl_FragColor = vec4(mix(color.rgb, grey, uShowDepth), 1.0);
  }
`;

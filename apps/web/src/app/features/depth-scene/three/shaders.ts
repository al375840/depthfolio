export const VERTEX_SHADER = /* glsl */ `
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
`;

export const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform float uShowDepth; // 0.0 = color image, 1.0 = depth heatmap

  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uColor, vUv);
    float depth = texture2D(uDepth, vUv).r;
    // near=white (1.0), far=black (0.0) — monochrome depth view
    vec3 grey = vec3(depth);
    gl_FragColor = vec4(mix(color.rgb, grey, uShowDepth), 1.0);
  }
`;

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
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(uColor, vUv);
  }
`;

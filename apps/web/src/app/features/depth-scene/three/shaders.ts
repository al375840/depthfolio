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

  // Blue (far=0) → Green (mid) → Red (near=1)
  vec3 heatmap(float t) {
    float r = smoothstep(0.45, 1.0, t);
    float g = 1.0 - abs(t - 0.5) * 2.2;
    float b = smoothstep(0.45, 0.0, t);
    return clamp(vec3(r, g, b), 0.0, 1.0);
  }

  void main() {
    vec4 color = texture2D(uColor, vUv);
    float depth = texture2D(uDepth, vUv).r;
    vec3 heat  = heatmap(depth);
    gl_FragColor = vec4(mix(color.rgb, heat, uShowDepth), 1.0);
  }
`;

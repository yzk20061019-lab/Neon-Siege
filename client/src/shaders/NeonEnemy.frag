uniform float uTime;
uniform vec3 uColor;
uniform float uHealthRatio;  // 0.0 (dead) to 1.0 (full)

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  // 菲涅尔边缘光：视线与法线夹角越大，边缘越亮
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

  // 脉冲：血量越低，脉冲越快（濒死时狂闪）
  float pulseSpeed = 2.0 + (1.0 - uHealthRatio) * 10.0;
  float pulse = sin(uTime * pulseSpeed) * 0.5 + 0.5;

  // 扫描线纹理
  float scanline = 0.85 + 0.15 * step(0.5, fract(vUv.y * 16.0 + uTime * 0.3));

  // 合成颜色，emissiveIntensity > 1 触发 UnrealBloomPass
  vec3 color = uColor * (fresnel * 3.0 + 0.4 + pulse * 0.6) * scanline;

  // 血量低时颜色偏红
  color = mix(color, vec3(1.0, 0.1, 0.1) * 3.0, (1.0 - uHealthRatio) * 0.5);

  gl_FragColor = vec4(color, 1.0);
}

/** 64-tap shaped bokeh blur — samples an aperture-shaped Poisson kernel with mip-based prefiltering. */
export const BOKEH_BLUR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTaps[64];        // aperture-shaped Poisson taps, unit radius
uniform float uRadiusFrac;     // blur radius as fraction of view height
uniform float uViewAspect;     // viewW / viewH
uniform vec4 uUvRect;          // overscan crop: xy offset, zw scale
uniform float uBloom;          // highlight boost 0..3
in vec2 vUv;
out vec4 outColor;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec2 base = uUvRect.xy + vUv * uUvRect.zw;
  if (uRadiusFrac < 0.0005) { outColor = vec4(texture(uTex, base).rgb, 1.0); return; }
  float lod = clamp(log2(max(uRadiusFrac * 1080.0, 1.0)) - 3.0, 0.0, 5.0);
  vec2 tapScale = vec2(uRadiusFrac / uViewAspect, uRadiusFrac) * uUvRect.zw;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 c = textureLod(uTex, base + uTaps[i] * tapScale, lod).rgb;
    float w = 1.0 + uBloom * pow(max(lum(c) - 0.6, 0.0) * 2.5, 2.0);
    acc += c * w;
    wsum += w;
  }
  outColor = vec4(acc / wsum, 1.0);
}`

#version 300 es
precision mediump float;

uniform sampler2D u_colorTexture;
uniform sampler2D u_depthTexture;
uniform vec2 u_shift;
uniform float u_scaleFactor;
uniform float u_depthFactor;

in vec2 v_texCoord;
out vec4 outColor;

vec2 smoothShift(vec2 shift, float depth) {
  float smoothDepth = smoothstep(0.0, 1.0, depth);
  return shift * smoothDepth;
}

void main()
{
  float str = length(u_shift);

  float depth = texture(u_depthTexture, v_texCoord).r;
  float undepth = 1.0 - depth;

  vec2 centeredTexCoord = v_texCoord - 0.5;

  float scale = mix(1.0 - u_scaleFactor * str, 1.0, depth);
  vec2 scaledTexCoord = (centeredTexCoord / scale) + 0.5;

  float depth2 = texture(u_depthTexture, scaledTexCoord).r;
  vec2 adjustedShift = smoothShift(u_shift, depth2);
  vec4 color = texture(u_colorTexture, scaledTexCoord + adjustedShift * str * u_depthFactor);

  outColor = color;
}

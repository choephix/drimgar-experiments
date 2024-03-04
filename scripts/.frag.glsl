precision highp float;

varying vec2 vFilterCoord;
varying vec2 vTextureCoord;
uniform sampler2D mapSampler;

uniform sampler2D imageSampler;
uniform vec4 inputSize;
uniform float scale;
uniform vec3 offset;
uniform float focus;
uniform float enlarge;
uniform float aspect;

vec3 perspective(
  vec2 uv,
  vec3 cameraShift,
  float convergence 
) {
  vec3 ray_origin = vec3(uv - 0.5, 0) * (1.0 - convergence * cameraShift.z); 
  vec3 ray_direction = vec3(0, 0, 1); 

  
  ray_origin.xy -= cameraShift.xy * convergence;
  ray_direction.xy += (uv - 0.5) * cameraShift.z + cameraShift.xy;

  const int step_count = 45; 
  const float hit_threshold = 0.01;
  ray_direction /= float(step_count);

  
  
  vec3 color = vec3(0.0);

  for (int i = 0; i < step_count; i++) {
    ray_origin += ray_direction;
    float scene_z = 1.0 - texture2D(mapSampler, ray_origin.xy + 0.5).x;
    if (ray_origin.z > scene_z) {
      if (ray_origin.z - scene_z < hit_threshold) {
        break;
      }
      ray_origin -= ray_direction; 
      ray_direction /= 2.0; 
    }
  }

  color = texture2D(imageSampler, ray_origin.xy + 0.5).rgb;
  #ifdef DEBUG_CROP
  if (
    ray_origin.x < -0.5 ||
    ray_origin.y < -0.5 ||
    ray_origin.x >= +0.5 ||
    ray_origin.y >= +0.5
  ) {
    color.r = 1.0;
  }
  #endif
  return color;
}

void main(void ) {
  #ifdef DEBUG_CROP
  bool highlightCrop = false;
  float e = 1.0 - 1.0 / enlarge;
  if (
    vTextureCoord.x < e / 2.0 ||
    vTextureCoord.x > 1.0 - e / 2.0 ||
    vTextureCoord.y < e / 2.0 ||
    vTextureCoord.y > 1.0 - e / 2.0
  ) {
    highlightCrop = true;
  }
  vec2 uv = vTextureCoord;
  #else
  vec2 uv = (vTextureCoord - vec2(0.5)) / vec2(enlarge) + vec2(0.5);
  #endif
  gl_FragColor = vec4(
    perspective(uv, vec3(offset.x, offset.y * aspect, offset.z), focus),
    1.0
  );
  #ifdef DEBUG_CROP
  gl_FragColor *= highlightCrop ? 0.2 : 1.0;
  #endif
}

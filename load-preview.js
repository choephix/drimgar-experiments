function getUrlParams(defaultValues = {}) {
  const params = new URLSearchParams(window.location.search);
  let urlParams = { ...defaultValues };
  for (let param of params) {
    let [key, value] = param;
    urlParams[key] = value;
  }
  return urlParams;
}

const urlParams = getUrlParams({
  art: 'eurydice-02',
  str: '1',
  fscale: '1.0', // '0.03'
  fdepth: '0.05', // '0.02'
  alt: undefined,
});

const ART_C = urlParams['art'];
const ART_D = ART_C.replace(/\//g, '+');
const colorTextureUrl = 'https://storage.drimgar.com/illustrations/' + ART_C + '.jpg';
const depthTextureUrl = 'https://drimgar-temp.web.app/' + ART_D + '-dpt_beit_large_512.png';

const STRENGTH = +urlParams['str'];

// Get the shader source
const vertexShaderSource = document.getElementById('vertex-shader').textContent;
const fragmentShaderSource = document.getElementById('fragment-shader').textContent;

/** - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - **/

// Get the WebGL context
const canvas = document.createElement('canvas');
document.getElementById('preview').appendChild(canvas);

const gl = canvas.getContext('webgl');

// Create the shaders
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

// Create the program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

// Use the program
gl.useProgram(program);

// Set the uniforms
const uniforms = {
  inputSize: [1.0, 1.0, 1.0, 1.0],
  outputFrame: [0.0, 0.0, 1.0, 1.0],
  scale: 1.0,
  offset: [0.0, 0.0, 0.0],
  focus: 1.0,
  enlarge: 1.0,
  aspect: 1.0,
};

for (const name in uniforms) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) continue;
  const value = uniforms[name];
  if (value.length === 1) {
    gl.uniform1f(location, value[0]);
  } else if (value.length === 2) {
    gl.uniform2fv(location, value);
  } else if (value.length === 3) {
    gl.uniform3fv(location, value);
  } else if (value.length === 4) {
    gl.uniform4fv(location, value);
  }
}

// Load the textures
const colorTexture = gl.createTexture();
const image = new Image();
image.crossOrigin = 'anonymous'; // Add this line
image.onload = function() {
  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  canvas.width = image.width;
  canvas.height = image.height;
};
image.src = colorTextureUrl;

const depthTexture = gl.createTexture();
const depthImage = new Image();
depthImage.crossOrigin = 'anonymous'; // Add this line
depthImage.onload = function() {
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, depthImage);
};
depthImage.src = depthTextureUrl;

// Create a full-screen square as the geometry
const vertices = new Float32Array([
  -1.0, -1.0,
   1.0, -1.0,
  -1.0,  1.0,
   1.0,  1.0,
]);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Get the location of the position attribute
const positionLocation = gl.getAttribLocation(program, 'aVertexPosition');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Bind the textures
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, colorTexture);
gl.uniform1i(gl.getUniformLocation(program, 'imageSampler'), 0);

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.uniform1i(gl.getUniformLocation(program, 'mapSampler'), 1);

// Draw the geometry
gl.viewport(0, 0, canvas.width, canvas.height);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

/** - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - * - **/

function draw() {
  // Draw the geometry
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Request the next frame
  requestAnimationFrame(draw);
}

// Start the drawing loop
draw();

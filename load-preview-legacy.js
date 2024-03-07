function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function showPreview(colorImgUrl, depthImgUrl) {
  const previewDiv = document.getElementById('preview');
  previewDiv.innerHTML = ``;

  const colorImg = await loadImage(colorImgUrl);
  const depthImg = await loadImage(depthImgUrl);

  const canvas = document.createElement('canvas');
  previewDiv.appendChild(canvas);

  // Assuming both images have the same dimensions
  canvas.width = colorImg.width;
  canvas.height = colorImg.height;

  // Assuming renderMSDFImage can handle both color and depth images
  return renderMSDFImage(canvas, colorImg, depthImg);
}

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

const ART = urlParams['art'];
const STRENGTH = +urlParams['str'];

function renderMSDFImage(canvas, colorImg, depthImg) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL context not available');
  }

  // Create vertex shader
  const vertexShaderSource = document.getElementById('vertex-shader-pix').textContent;
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  // Check if vertex shader compiled successfully
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error('Unable to compile vertex shader: ' + gl.getShaderInfoLog(vertexShader));
  }

  // Create fragment shader
  const fragmentShaderSourceId = 'fragment-shader-pix';
  const fragmentShaderSource = document.getElementById(fragmentShaderSourceId).textContent;
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  // Check if fragment shader compiled successfully
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error('Unable to compile fragment shader: ' + gl.getShaderInfoLog(fragmentShader));
  }

  // Create program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Check if program linked successfully
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Unable to link shader program: ' + gl.getProgramInfoLog(program));
  }

  // Create buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [-1, -1, -1, 1, 1, -1, 1, 1];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  const texCoords = [0, 1, 0, 0, 1, 1, 1, 0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

  // Create color texture
  const colorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, colorImg);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Create depth texture
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, depthImg);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Set up attributes and uniforms
  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const texCoordAttributeLocation = gl.getAttribLocation(program, 'a_texCoord');

  // Set up uniforms
  const colorTextureUniformLocation = gl.getUniformLocation(program, 'imageSampler');
  const depthTextureUniformLocation = gl.getUniformLocation(program, 'mapSampler');

  let scaleFactor = 0.03,
    depthFactor = 0.02;
  const scaleFactorUniformLocation = gl.getUniformLocation(program, 'u_scaleFactor');
  const depthFactorUniformLocation = gl.getUniformLocation(program, 'u_depthFactor');

  const shiftUniformLocation = gl.getUniformLocation(program, 'u_shift');
  let shift = [0.5, 0];

  const inputSizeUniformLocation = gl.getUniformLocation(program, 'inputSize');
  const scaleUniformLocation = gl.getUniformLocation(program, 'scale');
  const offsetUniformLocation = gl.getUniformLocation(program, 'offset');
  const focusUniformLocation = gl.getUniformLocation(program, 'focus');
  const enlargeUniformLocation = gl.getUniformLocation(program, 'enlarge');
  const aspectUniformLocation = gl.getUniformLocation(program, 'aspect');

  const { width, height } = colorImg;

  const inputSize = [width, height, 0, 0]; // Replace 'width' and 'height' with actual values
  const scale = 1.0;
  const offset = [0.0, 0.0, 0.0]; // X, Y, Z offset
  const focus = 1.0;
  const enlarge = 1.0;
  const aspect = width / height; // Replace 'width' and 'height' with actual values

  console.log('inputSize', inputSize);

  function draw() {
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.uniform1i(colorTextureUniformLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.uniform1i(depthTextureUniformLocation, 1);

    gl.uniform1f(scaleFactorUniformLocation, scaleFactor);
    gl.uniform1f(depthFactorUniformLocation, depthFactor);

    gl.uniform2fv(shiftUniformLocation, shift);

    gl.uniform4fv(inputSizeUniformLocation, inputSize);
    gl.uniform1f(scaleUniformLocation, scale);
    gl.uniform3fv(offsetUniformLocation, offset);
    gl.uniform1f(focusUniformLocation, focus);
    gl.uniform1f(enlargeUniformLocation, enlarge);
    gl.uniform1f(aspectUniformLocation, aspect);

    // Render
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Initial draw
  draw();

  return {
    setShift: function (newShift) {
      shift = newShift.map(v => v);
      draw();
    },
    setScaleFactor: function (newScaleFactor) {
      scaleFactor = newScaleFactor;
      draw();
    },
    setDepthFactor: function (newDepthFactor) {
      depthFactor = newDepthFactor;
      draw();
    },
  };
}

function addAltChecker() {
  showPreview(
    'https://storage.drimgar.com/illustrations/' + ART + '.jpg',
    'https://drimgar-temp.web.app/' + ART.replace(/\//g, '+') + '-dpt_beit_large_512.png'
  ).then(ctrl => {
    const previewDiv = document.getElementById('preview');

    ctrl.setScaleFactor(+urlParams['fscale']);
    ctrl.setDepthFactor(+urlParams['fdepth']);

    const loop = () => {
      const now = performance.now();
      const speed = 0.0025;
      // const strength = Math.abs(Math.sin(now * 0.00051)) * STRENGTH;
      const strength = STRENGTH;
      const shift = [
        //
        strength * Math.sin(now * speed),
        strength * Math.cos(now * speed),
      ];

      previewDiv.style.transform = `
            perspective(600px)
            rotateY(${-shift[0] * 10}deg)
            rotateX(${shift[1] * 10}deg)
          `;
      ctrl.setShift(shift);
      requestAnimationFrame(loop);
    };
    loop();
  });
}

window.addEventListener('DOMContentLoaded', loadManifestAndCreateLinks);

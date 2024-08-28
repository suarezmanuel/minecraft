import { png_sampler } from "./utils/png.js"

"use strict";

let keys = []
var cameraAngleRadians = degToRad(0);
var fieldOfViewRadians = degToRad(60);
var cameraPosX = 0;
var cameraPosY = 0;
var cameraPosZ = 0;
var speeds = [1, 5, 10, 20];
var index = 0;
var sampler = new png_sampler();
var size = 20;
var lenX = 80;
var lenY = 80;
var length = lenX * lenY;

var terrain = [];

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
}


async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");

  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var normalLocation = gl.getAttribLocation(program, "a_normal");

  // lookup uniforms
  var viewMatrixLocation = gl.getUniformLocation(program, "u_viewMatrix");
  var viewMatrixProjectionLocation = gl.getUniformLocation(program, "u_viewMatrixProjection");
  var colorLocation = gl.getUniformLocation(program, "u_color");
  var reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");

  // Create a buffer to put positions in
  var positionBuffer = gl.createBuffer();
  // setTerrain(gl, sampler, positionBuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  await setTerrain2(gl, sampler);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  setNormals(gl);

  drawScene();

  document.addEventListener("keydown", (event) => {
    // console.log(event.key);
    keys[event.key] = true;
  });

  document.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });

  setInterval(() => {
    var changed = false;
    if (keys["ArrowRight"]) {
      cameraAngleRadians += 0.01;
      changed = true;
    }

    if (keys["ArrowLeft"]) {
        cameraAngleRadians -= 0.01;
        changed = true;
    }

    if (keys[' ']) {
      cameraPosY += speeds[index];
      changed = true;
    }

    if (keys['Shift']) {
      cameraPosY -= speeds[index];
      changed = true;
    }

    if (keys['d']) {
      cameraPosX += speeds[index];
      changed = true;
    }

    if (keys['a']) {
      cameraPosX -= speeds[index];
      changed = true;
    }

    if (keys['s']) {
      cameraPosZ += speeds[index];
      changed = true;
    }

    if (keys['w']) {
      cameraPosZ -= speeds[index];
      changed = true;
    }

    if (keys['=']) {
      index = (index+1) % speeds.length;
      // dont wait for keyup
      keys['='] = false;    
      changed = true;
    }

    if (changed) {console.log(cameraPosX, cameraPosY, cameraPosZ); drawScene()};
  }, 20);

  // Draw the scene.
  function drawScene() {

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Turn on culling. By default backfacing triangles
    // will be culled.
    gl.enable(gl.CULL_FACE);

    // Enable the depth buffer
    gl.enable(gl.DEPTH_TEST);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);


    gl.enableVertexAttribArray(normalLocation);

    // console.log("drawing normals");
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    // put destination paramer
    gl.vertexAttribPointer(
        normalLocation, size, type, normalize, stride, offset);

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 5000;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Compute a matrix for the camera
    var cameraMatrix = m4.yRotation(cameraAngleRadians);
    cameraMatrix = m4.translate(cameraMatrix, cameraPosX, cameraPosY, cameraPosZ);

    // Make a view matrix from the camera matrix
    var viewMatrix = m4.inverse(cameraMatrix);

    // Compute a view projection matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    var matrix = viewProjectionMatrix;

    // Set the matrix.
    gl.uniformMatrix4fv(viewMatrixProjectionLocation, false, matrix);
    gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
    gl.uniform4fv(colorLocation, [0.2, 1, 0.2, 1]);

    gl.uniform3fv(reverseLightDirectionLocation, m4.normalize([0.5, 0.7, 1]));

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    // console.log("in draw", length);
    var count = 36 * length / 108;
    gl.drawArrays(primitiveType, offset, count);
  }
}

var m4 = {

  perspective: function(fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ];
  },

  projection: function(width, height, depth) {
    // Note: This matrix flips the Y axis so 0 is at the top.
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 2 / depth, 0,
      -1, 1, 0, 1,
    ];
  },

  multiply: function(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function(tx, ty, tz) {
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
    ];
  },

  xRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },

  yRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },

  zRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },

  translate: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  xRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },

  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },

  normalize: function(v) {
    const len = Math.sqrt(Math.pow(v[0],2)+Math.pow(v[1],2)+Math.pow(v[2],2));
    return [v[0]/len, v[1]/len, v[2]/len];
  },

  inverse: function(m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
            (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
            (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
            (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
            (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
            (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
            (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
            (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
            (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
            (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
            (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
            (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
            (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];
  },

  vectorMultiply: function(v, m) {
    var dst = [];
    for (var i = 0; i < 4; ++i) {
      dst[i] = 0.0;
      for (var j = 0; j < 4; ++j) {
        dst[i] += v[j] * m[j * 4 + i];
      }
    }
    return dst;
  },

};

// Fill the buffer with the values that define a letter 'F'.
function setCube(x, y, z) {

  return [
    // back face
    x,       y+size,  z,
    x+size,  y,       z,
    x,       y,       z,

    x,       y+size,  z,
    x+size,  y+size,  z,
    x+size,  y,       z,

    // front face
    x,       y+size,  z+size,
    x,       y,       z+size,
    x+size,  y,       z+size,

    x,       y+size,  z+size,
    x+size,  y,       z+size,
    x+size,  y+size,  z+size,

    // Left face
    x,       y,       z,
    x,       y,       z+size,
    x,       y+size,  z,

    x,       y,       z+size,
    x,       y+size,  z+size,
    x,       y+size,  z,

    // Right face
    x+size,  y,       z,
    x+size,  y+size,  z,
    x+size,  y,       z+size,

    x+size,  y,       z+size,
    x+size,  y+size,  z,
    x+size,  y+size,  z+size,

    // Top face
    x,       y+size,  z,
    x,       y+size,  z+size,
    x+size,  y+size,  z,

    x+size,  y+size,  z,
    x,       y+size,  z+size,
    x+size,  y+size,  z+size,

    // Bottom face
    x,       y,       z,
    x+size,  y,       z,
    x,       y,       z+size,

    x+size,  y,       z,
    x+size,  y,       z+size,
    x,       y,       z+size
  ];
}

function setNormals(gl) {
  var normals = [
    // front
    0,0,1,
    0,0,1,
    0,0,1,
    0,0,1,
    0,0,1,
    0,0,1,

    // back
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,

      // left
    -1,0,0,
    -1,0,0,
    -1,0,0,
    -1,0,0,
    -1,0,0,
    -1,0,0,

    // right
    1,0,0,
    1,0,0,
    1,0,0,
    1,0,0,
    1,0,0,
    1,0,0,

       // top
    0,1,0,
    0,1,0,
    0,1,0,
    0,1,0,
    0,1,0,
    0,1,0,

    // bottom
    0,-1,0,
    0,-1,0,
    0,-1,0,
    0,-1,0,
    0,-1,0,
    0,-1,0];

  var l = length/108;
  var dst = [];
  // let dst = new Float32Array(length);

  for (let i=0; i<l; i++) {
    // dst.set(normals, i);
    dst.push.apply(dst, normals);
  }
  // dst.push(1);
  // console.log("in normals", dst.length);
  // console.log(dst);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dst), gl.STATIC_DRAW);
}

async function setTerrain(gl, sampler) {

  await sampler.init_sampler("./resources/perlin_noise.png");

  var terrain = [];
  var prevHeightLeft = undefined;

  var topArr = [];
  var percentage = 0;

  for (let i=0; i < lenX; i++) {
    for (let j=0; j < lenY; j++) {

      var pixel = sampler.sample_pixel(i,j,0,1);
      var height = pixel[0]*size;

      if (prevHeightLeft != undefined) {
        height = (height + prevHeightLeft) / 2;
      }

      if (i > 0) {
        var topHeight = topArr[j];
        height = (height + topHeight) / 2;
      }

      height = Math.round(height/size) * size;
      console.log(i*size, height, j*size);

      terrain = [...terrain, ...setCube(i*size, height, j*size)];

      prevHeightLeft = height;
      topArr[j] = height;
    }

    console.log("generating terrain", percentage++, "/", lenX);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain), gl.STATIC_DRAW);
  console.log("terrain generated");
}

async function setTerrain2(gl, sampler) {

  await sampler.init_sampler("./resources/perlin_noise.png");

  // var terrain = [];
  var percentage = 0;

  for (let i=0; i < lenX; i++) {
    for (let j=0; j < lenY; j++) {

      var pixel = sampler.sample_pixel(i,j,0,1);
      terrain.push.apply(terrain, setCube(i*size, pixel[0]*size, j*size));
    }
  }

  for (let i=0; i < lenX; i++) {
    for (let j=0; j < lenY; j++) {

      var pixel = sampler.sample_pixel(i,j,0,1);
      var height = pixel[0]*size;
      var heightU = height;
      var heightD = height;
      var heightL = height;
      var heightR = height;

      if (i > 0) { heightU = terrain[(i-1)*lenX + j] }
      if (j > 0) { heightD = terrain[(i+1)*lenX + j] }
      if (i < lenX-1) { heightL = terrain[i*lenX + j-1] }
      if (j < lenY-1) { heightR = terrain[i*lenX + j+1] }

      var diff = (height - Math.min(heightU, heightD, heightL, heightR)) / size;

      terrain.push.apply(terrain, setCube(i*size, height, j*size));

      for (let k=0; k < diff; k++) {
        terrain.push.apply(terrain, setCube(i*size, (height/size-k)*size, j*size));
      }
    }
    console.log("generating terrain", percentage++, "/", lenX);
  }

  length = terrain.length;
  // console.log("in terrain gen", length);
  // console.log(terrain.length / length);
  // we cant optimize by initializing the arr beforehand, becaues we dont know diffs
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain), gl.STATIC_DRAW);
  console.log("terrain generated");
}

main();
import { png_sampler } from "./utils/png.js"
import { degToRad, m4 } from "./utils/math.js"

"use strict";

var keys = []

// var cameraAngleRadians = degToRad(0);
var fieldOfViewRadians = degToRad(60);

var cameraPos = [0,0,0];
var up = [0,1,0];
var forward = [0,0,1];
var right = [1,0,0];
// y axis rotation
var cameraYaw = 0;
// z axis rotation
var cameraPitch = 0;
var lookSpeed = 5;
var zNear = 1;
var zFar = 5000;

// mouse
var dx = 0;
var dy = 0;

// speeds[index]
var speeds = [1, 5, 10, 20];
var index = 0;
// used to sample texture for perlin noise
var sampler = new png_sampler();

var cubeSize = 20;
var cubeCountX = 10;
var cubeCountY = 10;
var mapSize = cubeCountX * cubeCountY;

var fps = 0;
var sumFrameTimes = 0;
var frameCount = 0;

var terrain = [];

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");

  if (!gl) {
    return;
  }

  // const canvas = document.getElementById("canvas");
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.scrollWidth * devicePixelRatio;
  canvas.height = canvas.scrollHeight * devicePixelRatio;
  window.addEventListener("resize", () => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.scrollWidth * devicePixelRatio;
    canvas.height = canvas.scrollHeight * devicePixelRatio;
  });


  // setup gui ###################################

  await ImGui.default();

  ImGui.CreateContext();
  ImGui_Impl.Init(canvas);

  ImGui.StyleColorsDark();
  //ImGui.StyleColorsClassic();

  const clear_color = new ImGui.ImVec4(0.45, 0.55, 0.60, 1.00);


  // setup gui ##################################


  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var normalLocation = gl.getAttribLocation(program, "a_normal");

  // lookup uniforms
  var worldMatrixLocation = gl.getUniformLocation(program, "u_worldMatrix");
  var viewMatrixProjectionLocation = gl.getUniformLocation(program, "u_viewMatrixProjection");
  var colorLocation = gl.getUniformLocation(program, "u_color");
  var reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");

  // Create a buffer to put positions in
  var positionBuffer = gl.createBuffer();
  // setTerrain(gl, sampler, positionBuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  await setTerrain(gl, sampler);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  setNormals(gl);

  // drawScene();

  document.addEventListener("keydown", (event) => {
    // console.log(event.key);
    keys[event.key] = true;
  });

  document.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });

  document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === canvas) {
          dx = event.movementX;
          dy = event.movementY;

          dx /= canvas.width;
          dy /= canvas.height;
      }
  })

  canvas.addEventListener('click', (event) => {
      canvas.requestPointerLock();
  })

  setInterval(() => {

    cameraYaw   += (dx * Math.PI) * lookSpeed * 60 / 1000;
    let a = (dy * Math.PI/2) * lookSpeed * 60 / 1000;
    cameraPitch = (Math.abs(cameraPitch - a) < 0.99*Math.PI/2) ?
                  cameraPitch - a 
                  : 
                  Math.sign(cameraPitch)*0.99*Math.PI/2;

    dx = 0;
    dy = 0;

    // drawGui();

    if (keys['d']) {
      cameraPos = m4.vectorSub(cameraPos, m4.vecScalarMultiply(right, speeds[index]));
    }

    if (keys['a']) {
      cameraPos = m4.vectorAdd(cameraPos, m4.vecScalarMultiply(right, speeds[index]));
    }

    if (keys[' ']) {
      cameraPos = m4.vectorAdd(cameraPos, m4.vecScalarMultiply(up, speeds[index]));
    }

    if (keys['Shift']) {
      cameraPos = m4.vectorSub(cameraPos, m4.vecScalarMultiply(up, speeds[index]));
    }

    if (keys['s']) {
      cameraPos = m4.vectorSub(cameraPos, m4.vecScalarMultiply(forward, speeds[index]));
    }

    if (keys['w']) {
      cameraPos = m4.vectorAdd(cameraPos, m4.vecScalarMultiply(forward, speeds[index]));
    }

    cameraPos = [Math.round(cameraPos[0]), Math.round(cameraPos[1]), Math.round(cameraPos[2])]

    if (keys['=']) {
      index = (index+1) % speeds.length;
      // dont wait for keyup
      keys['='] = false;    
    }

  }, 20);


  window.requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene() {

    let currentFrameTime = performance.now();

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    const glGUI = ImGui_Impl.gl;
    glGUI && glGUI.viewport(0, 0, glGUI.drawingBufferWidth, glGUI.drawingBufferHeight);
    glGUI && glGUI.clearColor(clear_color.x, clear_color.y, clear_color.z, clear_color.w);
    glGUI && glGUI.clear(glGUI.COLOR_BUFFER_BIT);

    ImGui_Impl.NewFrame(10);
    ImGui.NewFrame();

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
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);


    var target = [0,0,1,0];
    target = m4.vectorMultiply(target, m4.multiply(m4.yRotation(-cameraYaw), m4.xRotation(-cameraPitch)));
    
    forward = [target[0], target[1], target[2]];
    // up is always [0,1,0]
    right = m4.cross(up, forward);

    // this will remove the 4th coordinate of target
    target = m4.vectorAdd(target, cameraPos);
    var cameraMatrix = m4.lookAt(cameraPos, target, up);
    var viewMatrix = m4.inverse(cameraMatrix);

    // Compute a view projection matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    var worldMatrix = m4.identity();

    // Set the matrix.
    gl.uniformMatrix4fv(viewMatrixProjectionLocation, false, viewProjectionMatrix);
    gl.uniformMatrix4fv(worldMatrixLocation, false, worldMatrix);
    gl.uniform4fv(colorLocation, [0.2, 1, 0.2, 1]);

    gl.uniform3fv(reverseLightDirectionLocation, m4.normalize([0.5, 0.7, 1]));

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 36 * mapSize / 108;
    gl.drawArrays(primitiveType, offset, count);

    frameCount++;
    sumFrameTimes += performance.now() - currentFrameTime;

    if (frameCount > 100) {
      fps = Math.round((frameCount * 1000) / sumFrameTimes);
      sumFrameTimes = 0;
      frameCount = 0;
    }
    

    // draw gui ###################################

    ImGui.SetNextWindowPos(new ImGui.ImVec2(20, 20), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImGui.ImVec2(294, 140), ImGui.Cond.FirstUseEver);
    ImGui.Begin("Debug", null, 64);

    try {
 
    // camera ####
    ImGui.Text(`X Y Z: ${cameraPos[0]} ${cameraPos[1]} ${cameraPos[2]}`);
    ImGui.Text(`fps: ${fps}`);
    ImGui.Text(`speed: ${speeds[index]}`);
    ImGui.Text("zNear       ");
    ImGui.SameLine();
    ImGui.SliderInt("##4", (_ = zNear) => zNear = _, 1, 100);
    ImGui.Text("zFar        ");
    ImGui.SameLine();
    ImGui.SliderInt("##5", (_ = zFar) => zFar = _, 2000, 10000);

    // map    ####
    ImGui.Text(`map size: ${cubeCountX * cubeCountY}`);
    ImGui.Text("cube size   ");
    ImGui.SameLine();
    ImGui.SliderInt("##1", (_ = cubeSize) => cubeSize = _, 5, 30);

    ImGui.Text("cube count X");
    ImGui.SameLine();
    ImGui.SliderInt("##2", (_ = cubeCountX) => cubeCountX = _, 20, 100);

    ImGui.Text("cube count Y");
    ImGui.SameLine();
    ImGui.SliderInt("##3", (_ = cubeCountY) => cubeCountY = _, 20, 100);

    ImGui.ColorEdit4("clear color", clear_color);

    } catch (e) {
      ImGui.TextColored(new ImGui.ImVec4(1.0,0.0,0.0,1.0), "error: ");
      ImGui.SameLine();
      ImGui.Text(e.message);
    }

    ImGui.End();

    ImGui.EndFrame();

    ImGui.Render();
    // gl.useProgram(program);

    ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

    // draw gui ###################################

    // requestAnimationFrame(() => {
    //   notRendering = true;
    // })
      window.requestAnimationFrame(drawScene);
  }
}

function setCube(x, y, z) {

  return [
    // back face
    x,       y+cubeSize,  z,
    x+cubeSize,  y,       z,
    x,       y,       z,

    x,       y+cubeSize,  z,
    x+cubeSize,  y+cubeSize,  z,
    x+cubeSize,  y,       z,

    // front face
    x,       y+cubeSize,  z+cubeSize,
    x,       y,       z+cubeSize,
    x+cubeSize,  y,       z+cubeSize,

    x,       y+cubeSize,  z+cubeSize,
    x+cubeSize,  y,       z+cubeSize,
    x+cubeSize,  y+cubeSize,  z+cubeSize,

    // Left face
    x,       y,       z,
    x,       y,       z+cubeSize,
    x,       y+cubeSize,  z,

    x,       y,       z+cubeSize,
    x,       y+cubeSize,  z+cubeSize,
    x,       y+cubeSize,  z,

    // Right face
    x+cubeSize,  y,       z,
    x+cubeSize,  y+cubeSize,  z,
    x+cubeSize,  y,       z+cubeSize,

    x+cubeSize,  y,       z+cubeSize,
    x+cubeSize,  y+cubeSize,  z,
    x+cubeSize,  y+cubeSize,  z+cubeSize,

    // Top face
    x,       y+cubeSize,  z,
    x,       y+cubeSize,  z+cubeSize,
    x+cubeSize,  y+cubeSize,  z,

    x+cubeSize,  y+cubeSize,  z,
    x,       y+cubeSize,  z+cubeSize,
    x+cubeSize,  y+cubeSize,  z+cubeSize,

    // Bottom face
    x,       y,       z,
    x+cubeSize,  y,       z,
    x,       y,       z+cubeSize,

    x+cubeSize,  y,       z,
    x+cubeSize,  y,       z+cubeSize,
    x,       y,       z+cubeSize
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

  var l = mapSize/108;
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

  // var terrain = [];
  var percentage = 0;

  for (let i=0; i < cubeCountX; i++) {
    for (let j=0; j < cubeCountY; j++) {

      var pixel = sampler.sample_pixel(i,j,0,1);
      terrain.push.apply(terrain, setCube(i*cubeSize, pixel[0]*cubeSize, j*cubeSize));
    }
  }

  for (let i=0; i < cubeCountX; i++) {
    for (let j=0; j < cubeCountY; j++) {

      var pixel = sampler.sample_pixel(i,j,0,1);
      var height = pixel[0]*cubeSize;
      var heightU = height;
      var heightD = height;
      var heightL = height;
      var heightR = height;

      if (i > 0) { heightU = terrain[(i-1)*cubeCountX + j] }
      if (j > 0) { heightD = terrain[(i+1)*cubeCountX + j] }
      if (i < cubeCountX-1) { heightL = terrain[i*cubeCountX + j-1] }
      if (j < cubeCountY-1) { heightR = terrain[i*cubeCountX + j+1] }

      var diff = (height - Math.min(heightU, heightD, heightL, heightR)) / cubeSize;

      terrain.push.apply(terrain, setCube(i*cubeSize, height, j*cubeSize));

      for (let k=0; k < diff; k++) {
        terrain.push.apply(terrain, setCube(i*cubeSize, (height/cubeSize-k)*cubeSize, j*cubeSize));
      }
    }
    console.log("generating terrain", percentage++, "/", cubeCountX);
  }

  mapSize = terrain.length;
  // console.log("in terrain gen", length);
  // console.log(terrain.length / length);
  // we cant optimize by initializing the arr beforehand, becaues we dont know diffs
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain), gl.STATIC_DRAW);
  console.log("terrain generated");
}

main();
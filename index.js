import { png_sampler } from "./utils/png.js"
import { degToRad, m4 } from "./utils/math.js"

"use strict";

let keys = []

var cameraAngleRadians = degToRad(0);
var fieldOfViewRadians = degToRad(60);

var cameraPosX = 0;
var cameraPosY = 0;
var cameraPosZ = 0;

// speeds[index]
var speeds = [1, 5, 10, 20];
var index = 0;
// used to sample texture for perlin noise
var sampler = new png_sampler();

var cubeSize = 20;
var cubeCountX = 80;
var cubeCountY = 80;
var mapSize = cubeCountX * cubeCountY;

var fps = 0;

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

  /* static */ let buf = "Quick brown fox";
  /* static */ let f = 0.6;

  let done = false;

  // setup gui ##################################


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
  await setTerrain(gl, sampler);

  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  setNormals(gl);

  drawScene();
  // window.requestAnimationFrame(drawScene);

  document.addEventListener("keydown", (event) => {
    // console.log(event.key);
    keys[event.key] = true;
  });

  document.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });

  setInterval(() => {

    // drawGui();
    if (keys["ArrowRight"]) {
      cameraAngleRadians += 0.01;
    }

    if (keys["ArrowLeft"]) {
        cameraAngleRadians -= 0.01;
    }

    if (keys[' ']) {
      cameraPosY += speeds[index];
    }

    if (keys['Shift']) {
      cameraPosY -= speeds[index];
    }

    if (keys['d']) {
      cameraPosX += speeds[index];
    }

    if (keys['a']) {
      cameraPosX -= speeds[index];
    }

    if (keys['s']) {
      cameraPosZ += speeds[index];
    }

    if (keys['w']) {
      cameraPosZ -= speeds[index];
    }

    if (keys['=']) {
      index = (index+1) % speeds.length;
      // dont wait for keyup
      keys['='] = false;    
    }

    drawScene();
  }, 20);


  // Draw the scene.
  function drawScene() {

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
    var count = 36 * mapSize / 108;
    gl.drawArrays(primitiveType, offset, count);


    // draw gui ###################################

    ImGui.SetNextWindowPos(new ImGui.ImVec2(20, 20), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImGui.ImVec2(294, 140), ImGui.Cond.FirstUseEver);
    ImGui.Begin("Debug");

    try {
 
    ImGui.Text(`X Y Z: ${cameraPosX} ${cameraPosY} ${cameraPosZ}`);
    ImGui.Text(`speed: ${speeds[index]}`);
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
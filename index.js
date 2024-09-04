import { png_sampler } from "./utils/png.js"
import { degToRad, m4 } from "./utils/math.js"
import { createProgramFromFiles } from "./utils/shaderLoader.js"
import { backFace, frontFace, leftFace, rightFace, topFace, bottomFace, setCube } from "./utils/geometry.js"


"use strict";

var keys = []
var showChunks = false;

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
var speeds = [1, 5, 10, 20, 50];
var index = 0;
// used to sample texture for perlin noise
var sampler = new png_sampler();

var cubeSize = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var fps = 0;
var sumFrameTimes = 0;
var frameCount = 0;

var terrain = [];
var normals = [];
var indices = [];
var chunkBorderIndices = [];

const shadersFolder = "";
const clear_color = new ImGui.ImVec4(0.45, 0.55, 0.60, 1.00);


// set uniforms, attributes, ... etc
function setGLParameters(gl, program, obj) {

  obj.positionLocation = gl.getAttribLocation(program, "a_position");
  obj.normalLocation = gl.getAttribLocation(program, "a_normal");

  // lookup uniforms
  obj.worldMatrixLocation = gl.getUniformLocation(program, "u_worldMatrix");
  obj.viewMatrixProjectionLocation = gl.getUniformLocation(program, "u_viewMatrixProjection");
  obj.colorLocation = gl.getUniformLocation(program, "u_color");
  obj.reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");

  return obj;
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
 
  var gl = canvas.getContext("webgl");

  if (!gl) {
    return;
  }

  gl.getExtension("OES_element_index_uint");


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

  // setup gui ##################################

  // setup GLSL program

  
  var program = await createProgramFromFiles(gl, "./shaders/vertex-shader-3d.glsl", "./shaders/fragment-shader-3d.glsl");

  // start of shader ###########

  var positionLocation;
  var normalLocation;
  var worldMatrixLocation;
  var viewMatrixProjectionLocation;
  var colorLocation;
  var reverseLightDirectionLocation;

  ({positionLocation, normalLocation, worldMatrixLocation, viewMatrixProjectionLocation, colorLocation, reverseLightDirectionLocation} = setGLParameters(gl, program, {positionLocation, normalLocation, worldMatrixLocation, colorLocation, reverseLightDirectionLocation}));
  
  var positionBuffer; var indexBuffer; var normalBuffer;
  ({positionBuffer, indexBuffer, normalBuffer} = await setTerrain(gl, { positionBuffer, indexBuffer, normalBuffer }));
  
  addListeners();

  addInputInterval();
  
  window.requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene() {

    let currentFrameTime = performance.now();
    // gl.getExtension();
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

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    var primitiveType = gl.TRIANGLES;
    var count = indices.length;
    var type = gl.UNSIGNED_INT;
    var offset = 0;
    gl.drawElements(primitiveType, count, type, offset);

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

    let valueChanged = fillGUI();

    ImGui.End();

    ImGui.EndFrame();

    ImGui.Render();
    // gl.useProgram(program);

    ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

    // draw gui ###################################


    if (valueChanged) {

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      // dont need to await, sampler is already initialized
      setChunk(gl, sampler, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    }

    window.requestAnimationFrame(drawScene);
  }
  // end of shader ###########
}

function processFaces(func, arr, offset, ...params) {
  var res = func(...params);
  indices.push.apply(indices, res.indices.map(o => o+offset));
  normals.push.apply(normals, res.normals);
  arr.push.apply(arr, res.vertices);
}

async function setChunk(gl, sampler, offsetX, offsetY) {

  if (sampler.pixels == null) {
    await sampler.init_sampler("./resources/perlin_noise.png");
  }

  var percentage = 0;
  var terrainA = [];
  normals = [];
  indices = [];

  for (let i=0; i < 32; i++) {
    for (let j=0; j < 32; j++) {
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel(i+offsetX,j+offsetY,0,1);
      processFaces(setCube, terrainA, terrainA.length/3, cubeSize, (j+offsetY)*cubeSize, pixel[0]*cubeSize, (i+offsetX)*cubeSize);
    }
  }

  indices = [];
  normals = [];
  var terrainB = [];

  for (let i=0; i < 32; i++) {
    for (let j=0; j < 32; j++) {

      // get height of cube
      var height = terrainA[i*32*72 + j*72 + 4];
      var heightF = height;
      var heightB = height;
      var heightL = height;
      var heightR = height;

      var AddfrontFace = true;
      var AddbackFace = true;
      var AddleftFace = true;
      var AddrightFace = true;

      if (i > 0)    { heightF = terrainA[(i-1)*32*72 + j*72 + 4]; if (heightF == height) AddbackFace  = false }
      if (i < 31)   { heightB = terrainA[(i+1)*32*72 + j*72 + 4]; if (heightB == height) AddfrontFace = false }
      if (j > 0)    { heightL = terrainA[i*32*72 + (j-1)*72 + 4]; if (heightL == height) AddrightFace = false }
      if (j < 31)   { heightR = terrainA[i*32*72 + (j+1)*72 + 4]; if (heightR == height) AddleftFace  = false }

      var diff = (height - Math.min(heightF, heightB, heightL, heightR)) / cubeSize;
      processFaces(topFace,    terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize, height, (j+offsetY)*cubeSize);
      processFaces(bottomFace, terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize, height, (j+offsetY)*cubeSize);
      
      if (AddrightFace == true) processFaces(rightFace, terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize, height, (j+offsetY)*cubeSize);
      if (AddleftFace  == true) processFaces(leftFace,  terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize, height, (j+offsetY)*cubeSize);
      if (AddfrontFace == true) processFaces(frontFace, terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize, height, (j+offsetY)*cubeSize);
      if (AddbackFace  == true) processFaces(backFace,  terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize, height, (j+offsetY)*cubeSize);
      for (let k=0; k < diff-1; k++) {
        processFaces(topFace,   terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-k)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(rightFace, terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-k)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(leftFace,  terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-k)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(frontFace, terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-k)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(backFace,  terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-k)*cubeSize, (j+offsetY)*cubeSize);
      }
      if (diff > 0) { 
        processFaces(bottomFace, terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-diff+1)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(rightFace,  terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-diff+1)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(leftFace,   terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-diff+1)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(frontFace,  terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-diff+1)*cubeSize, (j+offsetY)*cubeSize);
        processFaces(backFace,   terrainB, terrainB.length/3, cubeSize, (i+offsetX)*cubeSize,  (height/cubeSize-diff+1)*cubeSize, (j+offsetY)*cubeSize);
      }
    }
  }

  terrain = terrainB;
  triangleCount = indices.length/3;

  // we cant optimize by initializing the arr beforehand, becaues we dont know diffs
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain), gl.STATIC_DRAW);
  console.log("terrain generated");
}

function addListeners() {
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
}

function addInputInterval() {

    setInterval(() => {

        cameraYaw   += (dx * Math.PI) * lookSpeed * 60 / 1000;
        let a = (dy * Math.PI/2) * lookSpeed * 60 / 1000;
        cameraPitch = (Math.abs(cameraPitch - a) < 0.99*Math.PI/2) ?
                    cameraPitch - a 
                    : 
                    Math.sign(cameraPitch)*0.99*Math.PI/2;

        dx = 0;
        dy = 0;


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

        if (keys['-']) {
        keys['-'] = false;
        showChunks = !showChunks;
        }

        cameraPos = [Math.round(cameraPos[0]), Math.round(cameraPos[1]), Math.round(cameraPos[2])]

        if (keys['=']) {
        index = (index+1) % speeds.length;
        // dont wait for keyup
        keys['='] = false;    
        }

    }, 20);
}

function fillGUI() {

  var valueChanged = false;

  try {
 
      // camera ####
      ImGui.Text(`X Y Z: ${cameraPos[0]} ${cameraPos[1]} ${cameraPos[2]}`);
      ImGui.Text(`fps: ${fps}`);
      ImGui.Text(`speed: ${speeds[index]}`);

      ImGui.Separator();
      // map    ####
      ImGui.Text(`map size:  ${cubeCountX * cubeCountY}`);
      ImGui.Text(`vertices:  ${(2*indices.length/3).toLocaleString()}`);
      ImGui.Text(`indices:   ${(indices.length).toLocaleString()}`);
      ImGui.SameLine();
      // accurate only for chrome
      ImGui.Text(` ${(indices.length/45776773).toFixed(3)}% full`);
      ImGui.Text(`triangles: ${triangleCount.toLocaleString()}`);

      ImGui.Separator();

      if (performance.memory) {
          let memoryInfo = performance.memory;
          ImGui.Text(`Total JS heap size: ${Math.trunc(memoryInfo.totalJSHeapSize / 1048576)} MB`);
          ImGui.Text(`Used JS heap size: ${Math.trunc(memoryInfo.usedJSHeapSize / 1048576)} MB`);
          ImGui.Text(`JS heap size limit: ${memoryInfo.jsHeapSizeLimit / 1048576} MB`);
      } else {
          ImGui.Text("Memory information is not available in this environment.");
      }

      ImGui.Separator();

      ImGui.Text("zNear       ");
      ImGui.SameLine();
      ImGui.SliderInt("##1", (_ = zNear) => zNear = _, 1, 100);
      ImGui.Text("zFar        ");
      ImGui.SameLine();
      ImGui.SliderInt("##2", (_ = zFar) => zFar = _, 5000, 100000);

      ImGui.Separator();

      ImGui.Text("cube size:  ");
      ImGui.SameLine();
      valueChanged |= ImGui.SliderInt("##3", (_ = cubeSize) => cubeSize = _, 5, 30);

      ImGui.Text("cube count X");
      ImGui.SameLine();
      // returns a bool
      valueChanged |= ImGui.SliderInt("##4", (_ = cubeCountX) => cubeCountX = _, 1, sampler.width);

      ImGui.Text("cube count Y");
      ImGui.SameLine();
      valueChanged |= ImGui.SliderInt("##5", (_ = cubeCountY) => cubeCountY = _, 1, sampler.height);

      // ImGui.Text("offset Y    ");
      // ImGui.SameLine();
      // valueChanged |= ImGui.SliderInt("##6", (_ = offsetY) => offsetY = _, 0, 100);

      ImGui.Separator();

      ImGui.ColorEdit4("clear color", clear_color);
      
    } catch (e) {
      ImGui.TextColored(new ImGui.ImVec4(1.0,0.0,0.0,1.0), "error: ");
      ImGui.SameLine();
      ImGui.Text(e.message);
    }

    return valueChanged;
}

main();

// init shaders, gl program
// add eventListeners for value changes
// calculate matrices
// set uniforms, lighting, matrices ...
// draw triangles
// draw gui
// check for updates in gui

export { setGLParameters };
import { degToRad, m4 } from "./utils/math.js"
import { initParams, bindParams, fillGUIRenderer, render, createProgram } from "./renderers/rasterizer.js"
import { initParams as initChunkBordersParams,
         bindParams as bindChunkBordersParams,
         render as renderChunkBorders,
         createProgram as createChunkBordersProgram } from "./renderers/chunkBorders.js"

"use strict";

var camera = {pos: [0,0,0], up: [0,1,0], forward: [0,0,1], right: [1,0,0], yaw: 0, pitch: 0}

var lookSpeed = 5;
var fieldOfViewRadians = degToRad(60);
var zNear = 1;
var zFar = 5000;

// mouse
var dx = 0;
var dy = 0;

var keys = []
// speeds[index]
var speeds = [1, 5, 10, 20, 50];
var index = 0;
var showChunks = false;

var fps = 0;
var sumFrameTimes = 0;
var frameCount = 0;

const clear_color = new ImGui.ImVec4(0.45, 0.55, 0.60, 1.00);


async function main() {

  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");

  var gl = canvas.getContext("webgl");

  if (!gl) {
    return;
  }

  // we need this to be able to have more than 65k indexed vertices
  // we could do around 4 billion. though practically i get that
  // js only allows for bufferArrays of size 47 mil in my computer.
  // we need this because 32x32x32 and even 16x16x16 have more than 65k vertices
  gl.getExtension("OES_element_index_uint");

  // make the canvas' pixels sharper for retina displays
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

  // ################################### setup gui


  // init programs ###############################

  var program = await createProgram(gl);

  await initParams(gl, program);

  var chunkProgram = await createChunkBordersProgram(gl);

  initChunkBordersParams(gl, chunkProgram);

  addListeners();

  addInputInterval();

  // ############################### init programs 

  // asks for first frame
  window.requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene() {

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    const glGUI = ImGui_Impl.gl;
    glGUI && glGUI.viewport(0, 0, glGUI.drawingBufferWidth, glGUI.drawingBufferHeight);
    glGUI && glGUI.clearColor(clear_color.x, clear_color.y, clear_color.z, clear_color.w);
    glGUI && glGUI.clear(glGUI.COLOR_BUFFER_BIT);

    ImGui_Impl.NewFrame(10);
    ImGui.NewFrame();

    // updates fps
    time(async () => {

      bindParams(gl, program);
      render(gl, program, fieldOfViewRadians, zNear, zFar, camera);
      
      if (showChunks) {
        bindChunkBordersParams(gl, chunkProgram)
        renderChunkBorders(gl, chunkProgram, fieldOfViewRadians, zNear, zFar, camera);
      }
    })


    ImGui.SetNextWindowPos(new ImGui.ImVec2(20, 20), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImGui.ImVec2(294, 140), ImGui.Cond.FirstUseEver);
    ImGui.Begin("Debug", null, 64);

    fillGUIGeneral(gl);

    ImGui.Separator();

    ImGui.ColorEdit4("clear color", clear_color);

    ImGui.End();

    ImGui.EndFrame();

    ImGui.Render();

    ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

    // asks for next frame
    window.requestAnimationFrame(drawScene);
  }
}

function fillGUIGeneral(gl) {
  ImGui.Text(`X Y Z: ${camera.pos[0]} ${camera.pos[1]} ${camera.pos[2]}`);
  ImGui.Text(`fps: ${fps}`);
  ImGui.Text(`speed: ${speeds[index]}`);

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

  fillGUIRenderer(gl);

  ImGui.Separator();

  ImGui.Text("zNear       ");
  ImGui.SameLine();
  ImGui.SliderInt("##1", (_ = zNear) => zNear = _, 1, 100);
  ImGui.Text("zFar        ");
  ImGui.SameLine();
  ImGui.SliderInt("##2", (_ = zFar) => zFar = _, 5000, 100000);

}

async function time(func) {

  let currentFrameTime = performance.now();

  await func();

  frameCount++;
  sumFrameTimes += performance.now() - currentFrameTime;

  if (frameCount > 100) {
    fps = Math.round((frameCount * 1000) / sumFrameTimes);
    sumFrameTimes = 0;
    frameCount = 0;
  }
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

    camera.yaw += (dx * Math.PI) * lookSpeed * 60 / 1000;
    let a = (dy * Math.PI / 2) * lookSpeed * 60 / 1000;
    camera.pitch = (Math.abs(camera.pitch - a) < 0.99 * Math.PI / 2) ?
      camera.pitch - a
      :
      Math.sign(camera.pitch) * 0.99 * Math.PI / 2;

    dx = 0;
    dy = 0;


    if (keys['d']) {
      camera.pos = m4.vectorSub(camera.pos, m4.vecScalarMultiply(camera.right, speeds[index]));
    }

    if (keys['a']) {
      camera.pos = m4.vectorAdd(camera.pos, m4.vecScalarMultiply(camera.right, speeds[index]));
    }

    if (keys[' ']) {
      camera.pos = m4.vectorAdd(camera.pos, m4.vecScalarMultiply(camera.up, speeds[index]));
    }

    if (keys['Shift']) {
      camera.pos = m4.vectorSub(camera.pos, m4.vecScalarMultiply(camera.up, speeds[index]));
    }

    if (keys['s']) {
      camera.pos = m4.vectorSub(camera.pos, m4.vecScalarMultiply(camera.forward, speeds[index]));
    }

    if (keys['w']) {
      camera.pos = m4.vectorAdd(camera.pos, m4.vecScalarMultiply(camera.forward, speeds[index]));
    }

    if (keys['-']) {
      keys['-'] = false;
      showChunks = !showChunks;
    }

    camera.pos = [Math.round(camera.pos[0]), Math.round(camera.pos[1]), Math.round(camera.pos[2])]

    if (keys['=']) {
      index = (index + 1) % speeds.length;
      // dont wait for keyup
      keys['='] = false;
    }

  }, 20);
}

main();
import { png_sampler } from "../utils/png.js"
import { m4 } from "../utils/math.js"
import { createProgramFromFiles } from "../utils/shaderLoader.js"
import { bindTerrain, getTerrainInfo, initTerrain} from "../utils/terrain.js"

"use strict";

// used to sample texture for perlin noise
var sampler = new png_sampler();

var positionLocation;
var normalLocation;
var worldMatrixLocation;
var viewMatrixProjectionLocation;
var colorLocation;
var reverseLightDirectionLocation;

var vertexBuffer;
var indexBuffer;
var normalBuffer;

var terrainInfo;

async function initParams(gl, program) {
  setGLParameters(gl, program);
  await initTerrain(sampler);
  terrainInfo = getTerrainInfo();
}

function bindParams(gl) {
  // will get initialized if undefined
  ({vertexBuffer, indexBuffer, normalBuffer} = bindTerrain(gl, {vertexBuffer, indexBuffer, normalBuffer}));
}

// set uniforms, attributes, ... etc
function setGLParameters(gl, program) {

  positionLocation = gl.getAttribLocation(program, "a_position");
  normalLocation = gl.getAttribLocation(program, "a_normal");

  // lookup uniforms
  worldMatrixLocation = gl.getUniformLocation(program, "u_worldMatrix");
  viewMatrixProjectionLocation = gl.getUniformLocation(program, "u_viewMatrixProjection");
  colorLocation = gl.getUniformLocation(program, "u_color");
  reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");
}

function render(gl, program, fieldOfViewRadians, zNear, zFar, camera) {

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
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // Tell the position attribute how to get data out of vertexBuffer (ARRAY_BUFFER)
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


  var target = [0, 0, 1, 0];
  target = m4.vectorMultiply(target, m4.multiply(m4.yRotation(-camera.yaw), m4.xRotation(-camera.pitch)));

  camera.forward = [target[0], target[1], target[2]];
  camera.up = [0,1,0];

  // up is always [0,1,0]
  camera.right = m4.cross(camera.up, camera.forward);

  // this will remove the 4th coordinate of target
  target = m4.vectorAdd(target, camera.pos);
  var cameraMatrix = m4.lookAt(camera.pos, target, camera.up);
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
  var count = terrainInfo.indicesLength;
  var type = gl.UNSIGNED_INT;
  var offset = 0;
  gl.drawElements(primitiveType, count, type, offset);
}

function fillGUIRenderer(gl) {

  var valueChanged = false;

  try {

    // map    ####
    ImGui.Text(`map size:  ${terrainInfo.cubeCountX * terrainInfo.cubeCountY}`);
    ImGui.Text(`vertices:  ${(2 * terrainInfo.indicesLength / 3).toLocaleString()}`);
    ImGui.Text(`indices:   ${(terrainInfo.indicesLength).toLocaleString()}`);
    ImGui.SameLine();
    // accurate only for 4 gb ram in browser available
    ImGui.Text(` ${(terrainInfo.indicesLength / 45776773).toFixed(3)}% full`);
    ImGui.Text(`triangles: ${terrainInfo.triangleCount.toLocaleString()}`);

    ImGui.Separator();

    ImGui.Text("cube size:  ");
    ImGui.SameLine();
    valueChanged |= ImGui.SliderInt("##3", (_ = terrainInfo.cubeSize) => terrainInfo.cubeSize = _, 5, 30);

    ImGui.Text("cube count X");
    ImGui.SameLine();
    // returns a bool
    valueChanged |= ImGui.SliderInt("##4", (_ = terrainInfo.cubeCountX) => terrainInfo.cubeCountX = _, 1, sampler.width);

    ImGui.Text("cube count Y");
    ImGui.SameLine();
    valueChanged |= ImGui.SliderInt("##5", (_ = terrainInfo.cubeCountY) => terrainInfo.cubeCountY = _, 1, sampler.height);

  } catch (e) {
    ImGui.TextColored(new ImGui.ImVec4(1.0, 0.0, 0.0, 1.0), "error: ");
    ImGui.SameLine();
    ImGui.Text(e.message);
  }

  if (valueChanged) {
    // this should set the buffers accordingly
    bindTerrain(gl, sampler, terrainInfo.cubeSize, {vertexBuffer, indexBuffer, normalBuffer});
  }
}

async function createProgram(gl) {
  return await createProgramFromFiles(gl, "./shaders/vertex-shader-3d.glsl", "./shaders/fragment-shader-3d.glsl");
}

export { render, createProgram, fillGUIRenderer, bindParams, initParams };
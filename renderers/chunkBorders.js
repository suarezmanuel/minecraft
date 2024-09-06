import { m4 } from "../utils/math.js"
import { createProgramFromFiles } from "../utils/shaderLoader.js"
import { initChunkBorders, bindChunkBorders, getChunksInfo } from "../utils/terrain.js"

"use strict";

var positionLocation;
var colorLocation;
var viewMatrixProjectionLocation;

var chunkVertexBuffer;
var chunkIndexBuffer;

var chunksInfo;

async function initParams(gl, program) {
  setGLParameters(gl, program);
  initChunkBorders();
  chunksInfo = getChunksInfo();
}

function bindParams(gl) {
  ({chunkVertexBuffer, chunkIndexBuffer} = bindChunkBorders(gl, {chunkVertexBuffer, chunkIndexBuffer}));
}

// set uniforms, attributes, ... etc
function setGLParameters(gl, program) { 

  positionLocation = gl.getAttribLocation(program, "a_position");

  viewMatrixProjectionLocation = gl.getUniformLocation(program, "u_viewMatrixProjection");
  colorLocation = gl.getUniformLocation(program, "u_color");
}

function render(gl, program, fieldOfViewRadians, zNear, zFar, camera) {

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas AND the depth buffer.
//   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Enable the depth buffer
//   gl.enable(gl.DEPTH_TEST);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Turn on the position attribute
  gl.enableVertexAttribArray(positionLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, chunkVertexBuffer);

  // Tell the position attribute how to get data out of chunkVertexBuffer (ARRAY_BUFFER)
  var size = 3;          // 3 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionLocation, size, type, normalize, stride, offset);

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

  // Set the matrix.
  gl.uniformMatrix4fv(viewMatrixProjectionLocation, false, viewProjectionMatrix);
  gl.uniform4fv(colorLocation, [1, 0.8, 0, 1]);
  // gl.uniform4fv(colorLocation, [0.2, 1, 0.2, 1]);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkIndexBuffer);

  var primitiveType = gl.LINES;
  var count = chunksInfo.chunkBordersIndicesLength;
  var type = gl.UNSIGNED_INT;
  var offset = 0;
  gl.drawElements(primitiveType, count, type, offset);
}

async function createProgram(gl) {
  return await createProgramFromFiles(gl, "./shaders/chunk-vertex-shader.glsl", "./shaders/chunk-fragment-shader.glsl");
}

export { render, createProgram, bindParams, initParams };
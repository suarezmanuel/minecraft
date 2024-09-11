import { m4 } from "../utils/math.js"
import { createProgramFromFiles } from "../utils/shaderLoader.js"

"use strict";

var positionLocation;
var colorLocation;
var viewMatrixProjectionLocation;
var cameraPositionLocation;

var colorsBuffer;
var verticesBuffer;

var colors   = new Float32Array([1,0,0,1,1,0,0,1, 0,1,0,1,0,1,0,1, 0,0,1,1,0,0,1,1]);
var vertices = new Float32Array([1,0,0, 0,0,0, 0,1,0, 0,0,0, 0,0,1 ,0,0,0]);

// set uniforms, attributes, ... etc
async function initParams(gl, program) {
  gl.useProgram(program);

  positionLocation = gl.getAttribLocation(program, "a_position");
  colorLocation = gl.getAttribLocation(program, "a_color");
  
  cameraPositionLocation = gl.getUniformLocation(program, "camera_pos");
  viewMatrixProjectionLocation = gl.getUniformLocation(program, "u_viewMatrixProjection");
}

function bindParams(gl) {
  if (colorsBuffer == undefined)   colorsBuffer = gl.createBuffer();
  if (verticesBuffer == undefined) verticesBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

function render(gl, fieldOfViewRadians, zNear, zFar, camera) {

  // Turn on the position attribute
  gl.enableVertexAttribArray(positionLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);

  // Tell the position attribute how to get data out of verticesBuffer (ARRAY_BUFFER)
  var size = 3;          // 3 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionLocation, size, type, normalize, stride, offset);


  gl.enableVertexAttribArray(colorLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);

  var size = 4;          
  var type = gl.FLOAT;   
  var normalize = false; 
  var stride = 0;        
  var offset = 0;       
  gl.vertexAttribPointer(
    colorLocation, size, type, normalize, stride, offset);


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

  // Set the matrix.
  gl.uniformMatrix4fv(viewMatrixProjectionLocation, false, viewMatrix);
  gl.uniform4fv(cameraPositionLocation, [camera.pos[0],camera.pos[1],camera.pos[2],0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);

  var primitiveType = gl.LINES;
  var count = 6;
  var offset = 0;
  gl.drawArrays(primitiveType, offset, count);
}

async function createProgram(gl) {
  return await createProgramFromFiles(gl, "./shaders/crosshair-vertex-shader.glsl", "./shaders/crosshair-fragment-shader.glsl");
}

export { render, createProgram, bindParams, initParams };
import { backFace, frontFace, leftFace, rightFace, topFace, bottomFace, setCube } from "./geometry.js"

var cubeSize = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var indices = [];
var normals = [];
var terrain = [];

async function setTerrain(gl, sampler, cubeSize, obj) {

  // Create a buffer to put positions in
  if (obj.positionBuffer == undefined) obj.positionBuffer = gl.createBuffer();
  await setChunk(sampler, cubeSize, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain), gl.STATIC_DRAW);

  if (obj.indexBuffer == undefined) obj.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

  if (obj.normalBuffer == undefined) obj.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  triangleCount = indices.length/3;

  return obj;
}

function getTerrainInfo() {
  var indicesLength = indices.length;
  return {cubeSize, cubeCountX, cubeCountY, triangleCount, indicesLength};
}

async function setChunk(sampler, cubeSize, chunkX, chunkY) {

  if (sampler.pixels == null) {
    await sampler.init_sampler("./resources/perlin_noise.png");
  }

  // var percentage = 0;
  var terrainA = [];
  // doing the plain normals = [] 
  // wont work because thats changing the reference not the insides of the array object,
  // thus we change the property to change the original one in index.js
  normals.length = 0;
  indices.length = 0;

  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel(i + chunkX, j + chunkY, 0, 1);
      processFaces(setCube, terrainA, terrainA.length / 3, cubeSize, (j + chunkY) * cubeSize, pixel[0] * cubeSize, (i + chunkX) * cubeSize);
    }
  }

  normals.length = 0;
  indices.length = 0;
  var terrainB = [];

  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {

      // get height of cube
      var height = terrainA[i * 32 * 72 + j * 72 + 4];
      var heightF = height;
      var heightB = height;
      var heightL = height;
      var heightR = height;

      var AddfrontFace = true;
      var AddbackFace = true;
      var AddleftFace = true;
      var AddrightFace = true;

      if (i > 0) { heightF = terrainA[(i - 1) * 32 * 72 + j * 72 + 4]; if (heightF == height) AddbackFace = false }
      if (i < 31) { heightB = terrainA[(i + 1) * 32 * 72 + j * 72 + 4]; if (heightB == height) AddfrontFace = false }
      if (j > 0) { heightL = terrainA[i * 32 * 72 + (j - 1) * 72 + 4]; if (heightL == height) AddrightFace = false }
      if (j < 31) { heightR = terrainA[i * 32 * 72 + (j + 1) * 72 + 4]; if (heightR == height) AddleftFace = false }

      var diff = (height - Math.min(heightF, heightB, heightL, heightR)) / cubeSize;

      var x = (i + chunkX) * cubeSize;
      var y = height;
      var z = (j + chunkY) * cubeSize;

      processFaces(topFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      processFaces(bottomFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      if (AddrightFace == true) processFaces(rightFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      if (AddleftFace == true) processFaces(leftFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      if (AddfrontFace == true) processFaces(frontFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      if (AddbackFace == true) processFaces(backFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);

      for (let k = 0; k < diff - 1; k++) {
        y = (height / cubeSize - k) * cubeSize;
        processFaces(topFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(rightFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(leftFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(frontFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(backFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      }
      if (diff > 0) {
        y = (height / cubeSize - diff + 1) * cubeSize;
        processFaces(bottomFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(rightFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(leftFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(frontFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
        processFaces(backFace, terrainB, terrainB.length / 3, cubeSize, x, y, z);
      }
    }
  }

  terrain = terrainB;
  console.log("terrain generated");
}

function processFaces(func, arr, offset, ...params) {
  var res = func(...params);
  indices.push.apply(indices, res.indices.map(o => o + offset));
  normals.push.apply(normals, res.normals);
  arr.push.apply(arr, res.vertices);
}


export { setTerrain, getTerrainInfo };
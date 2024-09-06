import { setCube, setCubeWireFrame } from "./geometry.js"

var cubeSize = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var chunkCountX = 10;
var chunkCountY = 10;
var chunkCountZ = 10;

var indices = [];
var normals = [];
var vertices = [];

var chunkBordersIndices  = [];
var chunkBordersVertices = [];
var activeChunksIndices  = [];
var activeChunksVertices = [];
var activeChunksNormals  = [];

var verticesProcessed = 0;
var changed = true;

async function initTerrain(sampler) {

  for (let i=0; i<chunkCountX; i++) {
    activeChunksIndices.push([]);
    activeChunksVertices.push([]);
    activeChunksNormals.push([]);
    for (let j=0; j<chunkCountY; j++) {
      activeChunksIndices[i].push([]);
      activeChunksVertices[i].push([]);
      activeChunksNormals[i].push([]);
      for (let k=0; k<chunkCountZ; k++) {
        activeChunksIndices[i][j].push([]);
        activeChunksVertices[i][j].push([]);
        activeChunksNormals[i][j].push([]);
      }
    }
  }

  for (let i=0; i<chunkCountX; i++) {
    for (let j=0; j<chunkCountZ; j++) {
      await setChunk(sampler, cubeSize, i, j);
    }
  }

  parseChunkMatrix();
  triangleCount = indices.length/3;
  console.log("terrain generated");

}

function initChunkBorders() {
  setChunkBorders();
}

function bindTerrain(gl, obj) {

  if (changed) {

    // Create a buffer to put positions in
    if (obj.vertexBuffer == undefined) obj.vertexBuffer = gl.createBuffer();
    if (obj.indexBuffer  == undefined) obj.indexBuffer  = gl.createBuffer();
    if (obj.normalBuffer == undefined) obj.normalBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    
    indices  = [];
    vertices = [];
    normals  = [];

    changed = false;
  }

  return obj;
}

function bindChunkBorders(gl, obj) {

  if (obj.chunkVertexBuffer == undefined) { obj.chunkVertexBuffer = gl.createBuffer(); }

  gl.bindBuffer(gl.ARRAY_BUFFER, obj.chunkVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunkBordersVertices), gl.STATIC_DRAW);

  if (obj.chunkIndexBuffer == undefined)  { obj.chunkIndexBuffer  = gl.createBuffer(); }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.chunkIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(chunkBordersIndices), gl.STATIC_DRAW);

  return obj;
}

function getTerrainInfo() {
  var indicesLength = indices.length;
  return {cubeSize, cubeCountX, cubeCountY, triangleCount, indicesLength};
}

function getChunksInfo() {
  var chunkBordersIndicesLength = chunkBordersIndices.length;
  return { chunkBordersIndicesLength };
}

async function setChunk(sampler, cubeSize, chunkX, chunkZ) {

  if (sampler.pixels == null) {
    await sampler.init_sampler("./resources/perlin_noise.png");
  }

  // var percentage = 0;
  var terrainA = [];
  normals = [];
  indices = [];

  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel(i + chunkX*32, j + chunkZ*32, 0, 1);
      terrainA.push.apply(terrainA, setCube(cubeSize, (j + chunkZ*32) * cubeSize, pixel[0] * cubeSize, (i + chunkX*32) * cubeSize).vertices);
    }
  }

  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {

      // get height of cube
      var height = terrainA[i * 32 * 72 + j * 72 + 4];
      var heightF = height; if (i > 0)  { heightF = terrainA[(i - 1) * 32 * 72 + j * 72 + 4]; }
      var heightB = height; if (i < 31) { heightB = terrainA[(i + 1) * 32 * 72 + j * 72 + 4]; }
      var heightL = height; if (j > 0)  { heightL = terrainA[i * 32 * 72 + (j - 1) * 72 + 4]; }
      var heightR = height; if (j < 31) { heightR = terrainA[i * 32 * 72 + (j + 1) * 72 + 4]; }
      
      var x = (i + chunkX*32) * cubeSize;
      var y = height;
      var z = (j + chunkZ*32) * cubeSize;

      var chunkY = Math.floor(y/(32*cubeSize));

      processFaces(setCube, chunkX, chunkY, chunkZ, cubeSize, x, y, z);

      var diff = (height - Math.min(heightF, heightB, heightL, heightR)) / cubeSize;

      for (let k = 1; k < diff; k++) {
        y = (height/cubeSize - k) * cubeSize;
        chunkY = Math.floor(y/(32*cubeSize));
        // the first params tell us where to store the cubes
        processFaces(setCube, chunkX, chunkY, chunkZ, cubeSize, x, y, z);
      }
    }
  }
}


function setChunkBorders() {
  
  chunkBordersVertices = [];
  chunkBordersIndices = [];

  var chunkSize = 32*cubeSize;

  for (let i=0; i<chunkCountX; i++) {
    for (let j=0; j<chunkCountY; j++) {
      for (let k=0; k<chunkCountZ; k++) {
        if (activeChunksVertices[i][j][k].length != 0) {
          var res = setCubeWireFrame(chunkSize, i*chunkSize, j*cubeSize*32, k*chunkSize);
          chunkBordersIndices.push.apply (chunkBordersIndices,  res.indices.map(o => o+(chunkBordersVertices.length/3)));
          chunkBordersVertices.push.apply(chunkBordersVertices, res.vertices);
        }
      }
    }
  }
}

function processFaces(func, chunkX, chunkY, chunkZ, ...params) {

  var res = func(...params);

  activeChunksIndices [chunkX][chunkY][chunkZ].push.apply(activeChunksIndices [chunkX][chunkY][chunkZ], res.indices.map(o => o+verticesProcessed/3));
  activeChunksVertices[chunkX][chunkY][chunkZ].push.apply(activeChunksVertices[chunkX][chunkY][chunkZ], res.vertices);
  verticesProcessed += res.vertices.length;
  activeChunksNormals [chunkX][chunkY][chunkZ].push.apply(activeChunksNormals [chunkX][chunkY][chunkZ], res.normals);
}

function parseChunkMatrix() {

  indices  = [];
  vertices = [];
  normals  = [];

  for (let i=0; i<chunkCountX; i++) {
    for (let j=0; j<chunkCountY; j++) {
      for (let k=0; k<chunkCountZ; k++) {
        indices.push.apply (indices,  activeChunksIndices [i][j][k]);
        vertices.push.apply(vertices, activeChunksVertices[i][j][k]);
        normals.push.apply (normals,  activeChunksNormals [i][j][k]);
      }
    }
  }
}

export { bindTerrain, initTerrain, setChunkBorders, getTerrainInfo, getChunksInfo, initChunkBorders, bindChunkBorders };

// queue of chunks [[], [], [], [], [], [], [], []] that get sent to vertices, indices according to some algo
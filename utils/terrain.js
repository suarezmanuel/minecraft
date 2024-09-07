import { setCube, setCubeWireFrame } from "./geometry.js"

var CUBE_SIZE = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var CHUNK_COUNT_X = 2;
var CHUNK_COUNT_Y = 4;
var CHUNK_COUNT_Z = 1;
var CHUNK_SIZE = 32;

var indices = [];
var normals = [];
var vertices = [];

var chunkBordersIndices  = [];
var chunkBordersVertices = [];
var chunksMask = [];
var activeChunks = new Array(CHUNK_COUNT_X*CHUNK_COUNT_Y*CHUNK_COUNT_Z).fill(0);
var heightsMask  = new Array(CHUNK_COUNT_X*CHUNK_COUNT_Z*CHUNK_SIZE*CHUNK_SIZE);

var changed = true;

async function initTerrain(sampler) {

  for (let i=0; i<CHUNK_COUNT_X; i++) {
   chunksMask.push([]);
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
     chunksMask[i].push([]);
      for (let k=0; k<CHUNK_COUNT_Z; k++) {
       chunksMask [i][j].push ([new Array(CHUNK_SIZE*CHUNK_SIZE*CHUNK_SIZE).fill(0)]);
      }
    }
  }

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Z; j++) {
      await setChunk(sampler, i, j);
    }
  }


  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Z; j++) {
      fillChunk(i, j);
      console.log(i*CHUNK_COUNT_X + j, "done out of", CHUNK_COUNT_X*CHUNK_COUNT_Z);
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
  return {CUBE_SIZE, cubeCountX, cubeCountY, triangleCount, indicesLength};
}

function getChunksInfo() {
  var chunkBordersIndicesLength = chunkBordersIndices.length;
  return { chunkBordersIndicesLength };
}

async function setChunk(sampler, chunkX, chunkZ) {

  if (sampler.pixels == null) {
    await sampler.init_sampler("./resources/perlin_noise.png");
  }

  // var percentage = 0;
  normals = [];
  indices = [];

  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel(i + chunkX*CHUNK_SIZE, j + chunkZ*CHUNK_SIZE, 0, 1);
      heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_X + i * CHUNK_SIZE + j] = Math.round(pixel[0]);
    }
  }

  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      // get height of cube
      var height = heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_Z + i * CHUNK_SIZE + j];

      var chunkY = Math.floor(height/CHUNK_SIZE);
      if (chunkY >= CHUNK_COUNT_Y) continue;
      var xIndex = i;
      var yIndex = height % CHUNK_SIZE;
      var zIndex = j;

      chunksMask[chunkX][chunkY][chunkZ][xIndex * CHUNK_SIZE*CHUNK_SIZE + yIndex * CHUNK_SIZE + zIndex] = 1;
      activeChunks[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Y + chunkY * CHUNK_COUNT_Y + chunkZ] = 1;      
    }
  }
}

function fillChunk(chunkX, chunkZ) {

  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {

      // get height of cube
      var height = heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_X + i * CHUNK_SIZE + j];

      var heightF = height; if (i > 0)  { heightF = heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_Z + (i-1) * CHUNK_SIZE + j]; }
      var heightB = height; if (i < 31) { heightB = heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_Z + (i+1) * CHUNK_SIZE + j]; }
      var heightL = height; if (j > 0)  { heightL = heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_Z + i * CHUNK_SIZE + (j-1)]; }
      var heightR = height; if (j < 31) { heightR = heightsMask[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Z + chunkZ * CHUNK_COUNT_Z + i * CHUNK_SIZE + (j+1)]; }

      var xIndex = i;
      var zIndex = j;

      var diff = height - Math.min(heightF, heightB, heightL, heightR);

      for (let k = 1; k < diff; k++) {
        var yIndex = (height-k) % CHUNK_SIZE;
        var chunkY = Math.floor((height-k)/CHUNK_SIZE);
        if (chunkY >= CHUNK_COUNT_Y) continue;
        chunksMask[chunkX][chunkY][chunkZ][xIndex * CHUNK_SIZE*CHUNK_SIZE + yIndex * CHUNK_SIZE + zIndex] = 1;
        activeChunks[chunkX * CHUNK_COUNT_X*CHUNK_COUNT_Y + chunkY * CHUNK_COUNT_Y + chunkZ] = 1;
      }
    }
  }
}


function setChunkBorders() {
  
  chunkBordersVertices = [];
  chunkBordersIndices = [];

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      for (let k=0; k<CHUNK_COUNT_Z; k++) {
        if (activeChunks[i * CHUNK_COUNT_X*CHUNK_COUNT_Y + j * CHUNK_COUNT_Y + k] == 1) {
          var res = setCubeWireFrame(CHUNK_SIZE*CUBE_SIZE, i*CHUNK_SIZE*CUBE_SIZE, j*CHUNK_SIZE*CUBE_SIZE, k*CHUNK_SIZE*CUBE_SIZE);
          chunkBordersIndices.push.apply (chunkBordersIndices,  res.indices.map(o => o+(chunkBordersVertices.length/3)));
          chunkBordersVertices.push.apply(chunkBordersVertices, res.vertices);
        }
      }
    }
  }
}

function parseChunkMatrix() {

  indices  = [];
  vertices = [];
  normals  = [];

  const c = CHUNK_SIZE*CUBE_SIZE;

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      for (let k=0; k<CHUNK_COUNT_Z; k++) {
        var arr = chunksMask[i][j][k];
        if (activeChunks[i * CHUNK_COUNT_X*CHUNK_COUNT_Y + j * CHUNK_COUNT_Y + k] == 0) continue;
        for (let ii=0; ii<CHUNK_SIZE; ii++) {
          for (let jj=0; jj<CHUNK_SIZE; jj++) {
            for (let kk=0; kk<CHUNK_SIZE; kk++) {
              if (arr[ii*CHUNK_SIZE*CHUNK_SIZE + jj*CHUNK_SIZE + kk] == 1) {
                var ans = setCube(CUBE_SIZE, ii*CUBE_SIZE + i*c, jj*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }
            }
          }
        }
      }
    }
  }
}

export { bindTerrain, initTerrain, setChunkBorders, getTerrainInfo, getChunksInfo, initChunkBorders, bindChunkBorders };

// queue of chunks [[], [], [], [], [], [], [], []] that get sent to vertices, indices according to some algo
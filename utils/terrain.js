import { setCube, setCubeWireFrame, leftFace, rightFace, bottomFace, topFace, frontFace, backFace } from "./geometry.js"

var CUBE_SIZE = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var CHUNK_COUNT_X = 20;
var CHUNK_COUNT_Y = 10;
var CHUNK_COUNT_Z = 20;
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

var sumTriTime = 0;
var sumAllTime = 0;

var t1 = 0;
var t2 = 0;

async function initTerrain(sampler) {

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    chunksMask.push([]);
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      chunksMask[i].push([]);
      for (let k=0; k<CHUNK_COUNT_Z; k++) {
       chunksMask [i][j].push (new Array(CHUNK_SIZE*CHUNK_SIZE*CHUNK_SIZE).fill(0));
      }
    }
  }

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Z; j++) {
     ({t1, t2} = await setChunk(sampler, i, j));
     sumTriTime += t1;
     sumAllTime += t2;
  }}

  console.log("sum triangles time", sumTriTime);
  console.log("sum all time", sumAllTime);

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Z; j++) {
      fillChunk(i, j);
      console.log(i*CHUNK_COUNT_X + j, "done out of", CHUNK_COUNT_X*CHUNK_COUNT_Z);
  }}

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

  var triTime = 0;
  var allTime = 0;

  triTime = performance.now();
  allTime = performance.now();

  if (sampler.pixels == null) {
    await sampler.init_sampler("./resources/perlin_noise3.png");
  }

  // var percentage = 0;
  normals = [];
  indices = [];

  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel(i + chunkX*CHUNK_SIZE, j + chunkZ*CHUNK_SIZE, 0, 1);
      heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + j] = Math.round(pixel[0]);
  }}

  triTime = performance.now() - triTime;

  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      // get height of cube
      var height = heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + j];

      var chunkY = Math.floor(height/CHUNK_SIZE);
      if (chunkY >= CHUNK_COUNT_Y) continue;
      var xIndex = i;
      var yIndex = height % CHUNK_SIZE;
      var zIndex = j;

      chunksMask[chunkX][chunkY][chunkZ][(xIndex * CHUNK_SIZE + zIndex) * CHUNK_SIZE + yIndex] = 1;
      activeChunks[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_COUNT_Y + chunkY] = 1;      
  }} 

  allTime = performance.now() - allTime;

  return {t1: triTime, t2: allTime};
}

function fillChunk(chunkX, chunkZ) {
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {

      // get height of cube
      var height = heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + j];
      
      var heightF = height;
      var heightB = height;
      var heightL = height;
      var heightR = height;

      if (i > 0)  { heightF = heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + (i-1) * CHUNK_SIZE + j]; }
      if (i < 31) { heightB = heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + (i+1) * CHUNK_SIZE + j]; }
      if (j > 0)  { heightL = heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + (j-1)]; }
      if (j < 31) { heightR = heightsMask[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + (j+1)]; }

      if (i==0 && chunkX > 0)                { heightF = heightsMask[((chunkX-1) * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + (CHUNK_SIZE-1) * CHUNK_SIZE + j]; }
      if (i==31 && chunkX < CHUNK_COUNT_X-1) { heightB = heightsMask[((chunkX+1) * CHUNK_COUNT_Z + chunkZ) * CHUNK_SIZE * CHUNK_SIZE + 0 * CHUNK_SIZE + j]; }
      if (j==0 && chunkZ > 0)                { heightL = heightsMask[(chunkX * CHUNK_COUNT_Z + (chunkZ-1)) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + (CHUNK_SIZE-1)]; }
      if (j==31 && chunkZ < CHUNK_COUNT_Z-1) { heightR = heightsMask[(chunkX * CHUNK_COUNT_Z + (chunkZ+1)) * CHUNK_SIZE * CHUNK_SIZE + i * CHUNK_SIZE + 0]; }

      var xIndex = i; 
      var zIndex = j;

      var diff = height - Math.min(heightF, heightB, heightL, heightR);

      for (let k = 1; k < diff; k++) {
        var yIndex = (height-k) % CHUNK_SIZE;
        var chunkY = Math.floor((height-k)/CHUNK_SIZE);
        if (chunkY >= CHUNK_COUNT_Y) continue;
        chunksMask[chunkX][chunkY][chunkZ][(xIndex * CHUNK_SIZE + zIndex) * CHUNK_SIZE + yIndex] = 1;
        activeChunks[(chunkX * CHUNK_COUNT_Z + chunkZ) * CHUNK_COUNT_Y + chunkY] = 1;    
      }
  }}
}


function setChunkBorders() {
  
  chunkBordersVertices = [];
  chunkBordersIndices = [];

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      for (let k=0; k<CHUNK_COUNT_Z; k++) {

        if (activeChunks[(i * CHUNK_COUNT_Z + k) * CHUNK_COUNT_Y + j] == 1) {
          var res = setCubeWireFrame(CHUNK_SIZE*CUBE_SIZE, i*CHUNK_SIZE*CUBE_SIZE, j*CHUNK_SIZE*CUBE_SIZE, k*CHUNK_SIZE*CUBE_SIZE);
          chunkBordersIndices.push.apply (chunkBordersIndices,  res.indices.map(o => o+(chunkBordersVertices.length/3)));
          chunkBordersVertices.push.apply(chunkBordersVertices, res.vertices);
        }
  }}}
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
        if (activeChunks[(i * CHUNK_COUNT_Z + k) * CHUNK_COUNT_Y + j] == 0) continue;

        for (let ii=0; ii<CHUNK_SIZE; ii++) {
          for (let jj=0; jj<CHUNK_SIZE; jj++) {
            for (let kk=0; kk<CHUNK_SIZE; kk++) {

              if (arr[(ii * CHUNK_SIZE + kk) * CHUNK_SIZE + jj] == 1) {
                var ans = setCube(CUBE_SIZE, ii*CUBE_SIZE + i*c, jj*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }
        }}}
  }}}
}

function parseChunkMatrix2() {

  indices  = [];
  vertices = [];
  normals  = [];

  const c = CHUNK_SIZE*CUBE_SIZE;
  const cc = CHUNK_SIZE*CHUNK_SIZE;

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      for (let k=0; k<CHUNK_COUNT_Z; k++) {

        var arr = chunksMask[i][j][k];
        if (activeChunks[(i * CHUNK_COUNT_Z + k) * CHUNK_COUNT_Y + j] == 0) continue;

        
        for (let ii=0; ii<CHUNK_SIZE; ii++) {

          if (ii > 1) continue;

          // get the whole Y*Z 2D array
          var subArray = arr.slice(ii*cc, (ii+1)*cc);

          for (let jj=0; jj<CHUNK_SIZE; jj++) {

            
            var t = parseInt(subArray.slice(jj*CHUNK_SIZE, (jj+1)*CHUNK_SIZE).join(''), 2);
            var t1 = ((t >>> 1) & (~t)) >>> 0;
            var t2 = ((t << 1) & (~t)) >>> 0;

            // front to back
            for (let kk=0; kk<CHUNK_SIZE; kk++) {
              if ((t >> kk) & 1) {
                var ans = leftFace(CUBE_SIZE, ii*CUBE_SIZE+ i*c, (CHUNK_SIZE-kk)*CUBE_SIZE + j*c, jj*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              } 

              if ((t >> kk) & 1) {
                var ans = rightFace(CUBE_SIZE, ii*CUBE_SIZE+ i*c, (CHUNK_SIZE-kk)*CUBE_SIZE + j*c, jj*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }
            }
          }
        }


        for (let ii=0; ii<CHUNK_SIZE; ii++) {
          
          for (let kk=0; kk<CHUNK_SIZE; kk++) {

            var a = [];
            for (let jj=0; jj<CHUNK_SIZE; jj++) {
              a.push(arr[ii*CHUNK_SIZE*CHUNK_SIZE + jj*CHUNK_SIZE + kk]);
            }
            var t = parseInt(a.join(''), 2);
            var t1 = ((t >>> 1) & (~t)) >>> 0;
            var t2 = ((t << 1) & (~t)) >>> 0;
  
            // front to back
            for (let jj=0; jj<CHUNK_SIZE; jj++) {
              if ((t >> jj) & 1) {
                var ans = topFace(CUBE_SIZE, ii*CUBE_SIZE+ i*c, (kk+1)*CUBE_SIZE + j*c, (CHUNK_SIZE-jj-1)*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }
  
              if ((t >> jj) & 1) {
                var ans = bottomFace(CUBE_SIZE, ii*CUBE_SIZE+ i*c, (kk+1)*CUBE_SIZE + j*c, (CHUNK_SIZE-jj-1)*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }
            }
          }
        }

        for (let kk=0; kk<CHUNK_SIZE; kk++) {

          for (let jj=0; jj<CHUNK_SIZE; jj++) {
            
            var a =[];
            for (let ii=0; ii<CHUNK_SIZE; ii++)  {
              a.push(arr[ii*CHUNK_SIZE*CHUNK_SIZE + jj*CHUNK_SIZE + kk]);
            }

            var t = parseInt(a.join(''), 2);
            var t1 = ((t >>> 1) & (~t)) >>> 0;
            var t2 = ((t << 1) & (~t)) >>> 0;

            // front to back
            for (let ii=0; ii<CHUNK_SIZE; ii++) {
              if ((t >> ii) & 1) {
                var ans = frontFace(CUBE_SIZE, (CHUNK_SIZE-ii-1)*CUBE_SIZE+ i*c, (kk+1)*CUBE_SIZE + j*c, jj*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }

              if ((t >> ii) & 1) {
                var ans = backFace(CUBE_SIZE, (CHUNK_SIZE-ii-1)*CUBE_SIZE+ i*c, (kk+1)*CUBE_SIZE + j*c, jj*CUBE_SIZE + k*c);
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

 

/*

generate perlin noise terrain setChunk (buffer of chunks positions to generate)
compress (buffer of things to compress)
triangles, uncompress (buffer of things to uncompress to triangles)
chunk manager (buffer of chunks to load)

*/
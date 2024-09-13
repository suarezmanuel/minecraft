import { setCube, setCubeWireFrame, leftFace, rightFace, bottomFace, topFace, frontFace, backFace } from "./geometry.js"

var CUBE_SIZE = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var CHUNK_COUNT_X = 10;
var CHUNK_COUNT_Y = 7;
var CHUNK_COUNT_Z = 10;
var CHUNK_SIZE = 32;

var indices = [];
var normals = [];
var vertices = [];

var chunkBordersIndices  = [];
var chunkBordersVertices = [];
var chunksMask = [];
var activeChunks = new Array(CHUNK_COUNT_X*CHUNK_COUNT_Y*CHUNK_COUNT_Z).fill(0);

var changed = true;

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

      await setChunk(sampler, i, j);
      console.log(i*CHUNK_COUNT_X + j, "done out of", CHUNK_COUNT_X*CHUNK_COUNT_Z);
  } }

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
    await sampler.init_sampler("./resources/perlin_noise3.png");
  }

  // var percentage = 0;
  normals = [];
  indices = [];

  var heights = new Array((CHUNK_SIZE+2)*(CHUNK_SIZE+2)).fill(-1);

  for (let i = 0; i < CHUNK_SIZE+2; i++) {
    for (let j = 0; j < CHUNK_SIZE+2; j++) {
      var sampleX = (i-1) + chunkX*CHUNK_SIZE;
      var sampleZ = (j-1) + chunkZ*CHUNK_SIZE;
      if ( sampleX < 0 || sampleX >= sampler.width ||
           sampleZ < 0 || sampleZ >= sampler.height) continue;
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel((i-1) + chunkX*CHUNK_SIZE, (j-1) + chunkZ*CHUNK_SIZE, 0, 1);
      heights[i * (CHUNK_SIZE+2) + j] = Math.round(pixel[0]);
  } }

  for (let i = 1; i < CHUNK_SIZE+1; i++) {
    for (let j = 1; j < CHUNK_SIZE+1; j++) {
      // get height of cube
      var height = heights[i * (CHUNK_SIZE+2) + j];

      var chunkY = Math.floor(height/CHUNK_SIZE);
      if (chunkY >= CHUNK_COUNT_Y) continue;
      var xIndex = i-1;
      var yIndex = height % CHUNK_SIZE;
      var zIndex = j-1;

      chunksMask[chunkX][chunkY][chunkZ][(xIndex * CHUNK_SIZE + yIndex) * CHUNK_SIZE + zIndex] = 1;
      activeChunks[(chunkX * CHUNK_COUNT_Y + chunkY) * CHUNK_COUNT_Z + chunkZ] = 1;      
  } } 

  for (let i = 1; i < CHUNK_SIZE+1; i++) {
    for (let j = 1; j < CHUNK_SIZE+1; j++) {

      // get height of cube
      var height = heights[i * (CHUNK_SIZE+2) + j];
      
      var heightF = heights[(i-1) * (CHUNK_SIZE+2) + j];
      var heightB = heights[(i+1) * (CHUNK_SIZE+2) + j];
      var heightL = heights[i * (CHUNK_SIZE+2) + (j-1)];
      var heightR = heights[i * (CHUNK_SIZE+2) + (j+1)];

      heightF = ((heightF == -1) ? height : heightF);
      heightB = ((heightB == -1) ? height : heightB);
      heightL = ((heightL == -1) ? height : heightL);
      heightR = ((heightR == -1) ? height : heightR);

      var diff = height - Math.min(heightF, heightB, heightL, heightR);

      var xIndex = i-1;
      var zIndex = j-1;

      for (let k = 1; k < diff; k++) {
        var yIndex = (height-k) % CHUNK_SIZE;
        var chunkY = Math.floor((height-k)/CHUNK_SIZE);
        if (chunkY >= CHUNK_COUNT_Y) continue;
        chunksMask[chunkX][chunkY][chunkZ][(xIndex * CHUNK_SIZE + yIndex) * CHUNK_SIZE + zIndex] = 1;
        activeChunks[(chunkX * CHUNK_COUNT_Y + chunkY) * CHUNK_COUNT_Z + chunkZ] = 1;    
      }
  } }
}

function setChunkBorders() {
  
  chunkBordersVertices = [];
  chunkBordersIndices = [];

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      for (let k=0; k<CHUNK_COUNT_Z; k++) {

        if (activeChunks[(i * CHUNK_COUNT_Y + j) * CHUNK_COUNT_Z + k] == 1) {
          var res = setCubeWireFrame(CHUNK_SIZE*CUBE_SIZE, i*CHUNK_SIZE*CUBE_SIZE, j*CHUNK_SIZE*CUBE_SIZE, k*CHUNK_SIZE*CUBE_SIZE);
          chunkBordersIndices.push.apply (chunkBordersIndices,  res.indices.map(o => o+(chunkBordersVertices.length/3)));
          chunkBordersVertices.push.apply(chunkBordersVertices, res.vertices);
        }
  } }}
}

function parseChunkMatrix() {

  indices  = [];
  vertices = [];
  normals  = [];

  const c = CHUNK_SIZE*CUBE_SIZE;
  const cc = CHUNK_SIZE*CHUNK_SIZE;

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Y; j++) {
      for (let k=0; k<CHUNK_COUNT_Z; k++) {

        var arr = chunksMask[i][j][k];
        if (activeChunks[(i * CHUNK_COUNT_Y + j) * CHUNK_COUNT_Z + k] == 0) continue;

        for (let kk=0; kk<CHUNK_SIZE; kk++) {
          for (let jj=0; jj<CHUNK_SIZE; jj++) {

            var a = [];
            for (let ii=0; ii<CHUNK_SIZE; ii++) {
              a.push(arr[ii*cc + jj*CHUNK_SIZE + kk]);
            }

            var t = parseInt(a.join(''), 2);
            var t1 = ((t >>> 1) & (~t)) >>> 0;
            var t2 = ((t << 1) & (~t)) >>> 0;

            // left to right
            for (let ii=0; ii<CHUNK_SIZE; ii++) {

              if ((t1 >> ii) & 1) {
                var ans = rightFace(CUBE_SIZE, (CHUNK_SIZE-ii-2)*CUBE_SIZE + i*c, (jj+1)*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              } 

              if ((t2 >> ii) & 1) {
                var ans = leftFace(CUBE_SIZE, (CHUNK_SIZE-ii)*CUBE_SIZE+ i*c, (jj+1)*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }

              if (ii==0) {
                if (arr[(ii*CHUNK_SIZE + jj) * CHUNK_SIZE + kk] == 1) {
                  var ans = leftFace(CUBE_SIZE, (CHUNK_SIZE-ii)*CUBE_SIZE+ (i-1)*c, (jj+1)*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                  indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                  vertices.push.apply(vertices, ans.vertices);
                  normals.push.apply (normals,  ans.normals);
              } }

              if (ii==CHUNK_SIZE-1) {
                if (arr[(ii*CHUNK_SIZE + jj) * CHUNK_SIZE + kk] == 1) {
                  var ans = rightFace(CUBE_SIZE, (CHUNK_SIZE-ii-2)*CUBE_SIZE + (i+1)*c, (jj+1)*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                  indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                  vertices.push.apply(vertices, ans.vertices);
                  normals.push.apply (normals,  ans.normals);
              } }
            }
        } }

        for (let ii=0; ii<CHUNK_SIZE; ii++) {
          for (let kk=0; kk<CHUNK_SIZE; kk++) {

            var a = [];
            for (let jj=0; jj<CHUNK_SIZE; jj++) {
              a.push(arr[ii*cc + jj*CHUNK_SIZE + kk]);
            }

            var t = parseInt(a.join(''), 2);
            var t1 = ((t >>> 1) & (~t)) >>> 0;
            var t2 = ((t << 1) & (~t)) >>> 0;

            // top to bottom
            for (let jj=0; jj<CHUNK_SIZE; jj++) {

              if ((t1 >> jj) & 1) {
                var ans = topFace(CUBE_SIZE, ii*CUBE_SIZE + i*c, (CHUNK_SIZE-jj-1)*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }

              if ((t2 >> jj) & 1) {
                var ans = bottomFace(CUBE_SIZE, ii*CUBE_SIZE+ i*c, (CHUNK_SIZE-jj+1)*CUBE_SIZE + j*c, kk*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }

              if (jj==CHUNK_SIZE-1) {
                if (arr[(ii*CHUNK_SIZE + jj) * CHUNK_SIZE + kk] == 1) {
                  var ans = topFace(CUBE_SIZE, ii*CUBE_SIZE + i*c, (CHUNK_SIZE-jj-1)*CUBE_SIZE + (j+1)*c, kk*CUBE_SIZE + k*c);
                  indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                  vertices.push.apply(vertices, ans.vertices);
                  normals.push.apply (normals,  ans.normals);
              } }

              if (jj==0) {
                if (arr[(ii*CHUNK_SIZE + jj) * CHUNK_SIZE + kk] == 1) {
                  var ans = bottomFace(CUBE_SIZE, ii*CUBE_SIZE+ i*c, (CHUNK_SIZE-jj+1)*CUBE_SIZE + (j-1)*c, kk*CUBE_SIZE + k*c);
                  indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                  vertices.push.apply(vertices, ans.vertices);
                  normals.push.apply (normals,  ans.normals);
              } }
            }
        } }

        for (let ii=0; ii<CHUNK_SIZE; ii++) {
          for (let jj=0; jj<CHUNK_SIZE; jj++) {
            
            var a =[];
            for (let kk=0; kk<CHUNK_SIZE; kk++)  {
              a.push(arr[ii*cc + jj*CHUNK_SIZE + kk]);
            }

            var t = parseInt(a.join(''), 2);
            var t1 = ((t >>> 1) & (~t)) >>> 0;
            var t2 = ((t << 1) & (~t)) >>> 0;

            // front to back
            for (let kk=0; kk<CHUNK_SIZE; kk++) {

              if ((t2 >> kk) & 1) {
                var ans = frontFace(CUBE_SIZE, (ii)*CUBE_SIZE+ i*c, (jj+1)*CUBE_SIZE + j*c, (CHUNK_SIZE-kk-1)*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }

              if ((t1 >> kk) & 1) {
                var ans = backFace(CUBE_SIZE, (ii)*CUBE_SIZE+ i*c, (jj+1)*CUBE_SIZE + j*c, (CHUNK_SIZE-kk-1)*CUBE_SIZE + k*c);
                indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                vertices.push.apply(vertices, ans.vertices);
                normals.push.apply (normals,  ans.normals);
              }

              if (kk==0) {
                if (arr[(ii*CHUNK_SIZE + jj) * CHUNK_SIZE + kk] == 1) {
                  var ans = frontFace(CUBE_SIZE, (ii)*CUBE_SIZE+ i*c, (jj+1)*CUBE_SIZE + j*c, (CHUNK_SIZE-kk-1)*CUBE_SIZE + (k-1)*c);
                  indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                  vertices.push.apply(vertices, ans.vertices);
                  normals.push.apply (normals,  ans.normals);
              } }

              if (kk==CHUNK_SIZE-1) {
                if (arr[(ii*CHUNK_SIZE + jj) * CHUNK_SIZE + kk] == 1) {
                  var ans = backFace(CUBE_SIZE, (ii)*CUBE_SIZE+ i*c, (jj+1)*CUBE_SIZE + j*c, (CHUNK_SIZE-kk-1)*CUBE_SIZE + (k+1)*c);
                  indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
                  vertices.push.apply(vertices, ans.vertices);
                  normals.push.apply (normals,  ans.normals);
              } }
            }
        } }
  } } }
}

export { bindTerrain, initTerrain, setChunkBorders, getTerrainInfo, getChunksInfo, initChunkBorders, bindChunkBorders };
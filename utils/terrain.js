import { setCube, setCubeWireFrame, leftFace, rightFace, bottomFace, topFace, frontFace, backFace } from "./geometry.js"

var CUBE_SIZE = 20;
var cubeCountX = 16;
var cubeCountY = 16;
var triangleCount = 0;

var CHUNK_COUNT_X = 1;
var CHUNK_COUNT_Y = 7;
var CHUNK_COUNT_Z = 1;
var CHUNK_SIZE = 32;

var indices = [];
var normals = [];
var vertices = [];

var indicesIntArray;
var verticesFloatArray;
var normalsFloatArray;

var chunkBordersIndices  = [];
var chunkBordersVertices = [];

var voxelBordersIndices = [];
var voxelBordersIndicesIntArray;
var activeChunks = new Array(CHUNK_COUNT_X*CHUNK_COUNT_Y*CHUNK_COUNT_Z).fill(0);

var changed = true;

async function initTerrain(sampler) {

  const lodFactor = 0;

  for (let i=0; i<CHUNK_COUNT_X; i++) {
    for (let j=0; j<CHUNK_COUNT_Z; j++) {
      const chunkSize = Math.max(CHUNK_SIZE / Math.pow(2,lodFactor));
      var mask = new Array(chunkSize*chunkSize*chunkSize*CHUNK_COUNT_Y).fill(0);
      await setChunk(mask, sampler, i, j, lodFactor);
      parseChunk(mask, i, j, lodFactor);
      console.log(i*CHUNK_COUNT_X + j, "done out of", CHUNK_COUNT_X*CHUNK_COUNT_Z);
  } } 

  triangleCount = indices.length/3;
  console.log("terrain generated");
}

function initChunkBorders() {
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
  } } }
}

function initVoxelWireframe() {
  // nothing, the initTerrain already does this for us
}

function bindTerrain(gl, obj) {

  if (changed) {

    // Create a buffer to put positions in
    if (obj.vertexBuffer == undefined) obj.vertexBuffer = gl.createBuffer();
    if (obj.indexBuffer  == undefined) obj.indexBuffer  = gl.createBuffer();
    if (obj.normalBuffer == undefined) obj.normalBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    if (normalsFloatArray == undefined) normalsFloatArray = new Float32Array(normals);
    gl.bufferData(gl.ARRAY_BUFFER, normalsFloatArray, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
    if (verticesFloatArray == undefined) verticesFloatArray = new Float32Array(vertices);
    gl.bufferData(gl.ARRAY_BUFFER, verticesFloatArray, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    if (indicesIntArray == undefined) indicesIntArray = new Uint32Array(indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesIntArray, gl.STATIC_DRAW);
    
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

function bindVoxelWireframe(gl, obj) {

  if (obj.voxelWireframeVertexBuffer == undefined) { obj.voxelWireframeVertexBuffer = gl.createBuffer(); }

  gl.bindBuffer(gl.ARRAY_BUFFER, obj.voxelWireframeVertexBuffer);
  // it uses the same vertices as terrain
  gl.bufferData(gl.ARRAY_BUFFER, verticesFloatArray, gl.STATIC_DRAW);

  if (obj.voxelWireframeIndexBuffer == undefined)  { obj.voxelWireframeIndexBuffer  = gl.createBuffer(); }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.voxelWireframeIndexBuffer);
  if (voxelBordersIndicesIntArray == undefined) voxelBordersIndicesIntArray = new Uint32Array(voxelBordersIndices);
  // the array is filled at initTerrain
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, voxelBordersIndicesIntArray, gl.STATIC_DRAW);

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

function getVoxelWireframeInfo() {
  return { voxelWireframeIndexLength: voxelBordersIndices.length };
}

async function setChunk(mask, sampler, chunkX, chunkZ, lodFactor) {

  if (sampler.pixels == null) {
    await sampler.init_sampler("./resources/perlin_noise3.png");
  }

  const LOD = Math.pow(2,lodFactor);
  const chunkSize = Math.max(CHUNK_SIZE/LOD,1);
  var heights = new Array((chunkSize+2)*(chunkSize+2)).fill(-1);

  for (let i = 0; i < chunkSize+2; i++) {
    for (let j = 0; j < chunkSize+2; j++) {
      var sampleX = (i-1)*LOD + chunkX*CHUNK_SIZE;
      var sampleZ = (j-1)*LOD + chunkZ*CHUNK_SIZE;
      if ( sampleX < 0 || sampleX >= sampler.width ||
           sampleZ < 0 || sampleZ >= sampler.height) continue;
      // holds values from 0 to 255
      var pixel = sampler.sample_pixel(sampleX, sampleZ, 0, 1);
      heights[i * (chunkSize+2) + j] = Math.round(pixel[0]);
  } }

  for (let i = 1; i < chunkSize+1; i++) {
    for (let j = 1; j < chunkSize+1; j++) {
      // get height of cube
      var height = heights[i * (chunkSize+2) + j];

      var adjustedHeight = Math.ceil(height/LOD);
      var chunkY = Math.ceil(height/CHUNK_SIZE);
      if (chunkY >= CHUNK_COUNT_Y) continue;
      var yIndex = adjustedHeight % chunkSize;
      if (yIndex == 0) chunkY++;
      var xIndex = (i-1);
      var zIndex = (j-1);

      mask[((xIndex * chunkSize + yIndex) * chunkSize + zIndex) + chunkY*chunkSize*chunkSize*chunkSize] = 1;
      activeChunks[(chunkX * CHUNK_COUNT_Y + chunkY) * CHUNK_COUNT_Z + chunkZ] = 1; 
  } } 

  for (let i = 1; i < chunkSize+1; i++) {
    for (let j = 1; j < chunkSize+1; j++) {

      // get height of cube
      var height = heights[i * (chunkSize+2) + j];
      
      var heightF = heights[(i-1) * (chunkSize+2) + j];
      var heightB = heights[(i+1) * (chunkSize+2) + j];
      var heightL = heights[i * (chunkSize+2) + (j-1)];
      var heightR = heights[i * (chunkSize+2) + (j+1)];

      heightF = ((heightF == -1) ? height : heightF);
      heightB = ((heightB == -1) ? height : heightB);
      heightL = ((heightL == -1) ? height : heightL);
      heightR = ((heightR == -1) ? height : heightR);

      var diff = height - Math.min(heightF, heightB, heightL, heightR);

      var xIndex = (i-1);
      var zIndex = (j-1);

      for (let k = 1; k < diff; k++) {

        var adjustedHeight = Math.ceil((height-k)/LOD);
        var yIndex = adjustedHeight % chunkSize;
        var chunkY = Math.ceil((height-k)/CHUNK_SIZE);
        if (chunkY >= CHUNK_COUNT_Y) continue;
        if (yIndex == 0) chunkY++;

        mask[((xIndex * chunkSize + yIndex) * chunkSize + zIndex) + chunkY*chunkSize*chunkSize*chunkSize] = 1;
        activeChunks[(chunkX * CHUNK_COUNT_Y + chunkY) * CHUNK_COUNT_Z + chunkZ] = 1;  
      }
  } }
}

function parseChunk(arr, i, k, lodFactor) {

  const LOD = Math.pow(2, lodFactor);
  const chunkSize = Math.max(CHUNK_SIZE/LOD,1);
  const cubeSize = CUBE_SIZE*LOD;
  const c = chunkSize*cubeSize;
  const cc = chunkSize*chunkSize;

  for (let j=0; j<CHUNK_COUNT_Y; j++) {

    // if (j!=4) continue;
    if (activeChunks[(i*CHUNK_COUNT_Y + j) * CHUNK_COUNT_Z + k] == 0) continue;

    for (let kk=0; kk<chunkSize; kk++) {
      for (let jj=0; jj<chunkSize; jj++) {

        var a = [];
        for (let ii=0; ii<chunkSize; ii++) {
          a.push(arr[(ii*cc + jj*chunkSize + kk) + j*chunkSize*chunkSize*chunkSize]);
        }

        var t = parseInt(a.join(''), 2);
        var t1 = ((t >>> 1) & (~t)) >>> 0;
        var t2 = ((t << 1) & (~t)) >>> 0;

        // left to right
        for (let ii=0; ii<chunkSize; ii++) {

          if ((t1 >> ii) & 1) {
            var ans = rightFace(cubeSize, (chunkSize-ii-1)*cubeSize + i*c, (jj)*cubeSize + j*c, kk*cubeSize + k*c);
            indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
            vertices.push.apply(vertices, ans.vertices);
            normals.push.apply (normals,  ans.normals);
          } 

          if ((t2 >> ii) & 1) {
            var ans = leftFace(cubeSize, (chunkSize-ii)*cubeSize + i*c, (jj)*cubeSize + j*c, kk*cubeSize + k*c);
            indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
            vertices.push.apply(vertices, ans.vertices);
            normals.push.apply (normals,  ans.normals);
          }

          if (ii==0) {
            if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
              var ans = leftFace(cubeSize, (chunkSize-ii)*cubeSize + (i-1)*c, (jj)*cubeSize + j*c, kk*cubeSize + k*c);
              indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
              vertices.push.apply(vertices, ans.vertices);
              normals.push.apply (normals,  ans.normals);
          } }

          if (ii==chunkSize-1) {
            if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
              var ans = rightFace(cubeSize, (chunkSize-ii-1)*cubeSize + (i+1)*c, (jj)*cubeSize + j*c, kk*cubeSize + k*c);
              indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
              voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
              vertices.push.apply(vertices, ans.vertices);
              normals.push.apply (normals,  ans.normals);
          } }
        }
    } }

    // for (let ii=0; ii<chunkSize; ii++) {
    //   for (let kk=0; kk<chunkSize; kk++) {

    //     var a = [];
    //     for (let jj=0; jj<chunkSize; jj++) {
    //       a.push(arr[(ii*cc + jj*chunkSize + kk) + j*chunkSize*chunkSize*chunkSize]);
    //     }

    //     var t = parseInt(a.join(''), 2);
    //     var t1 = ((t >>> 1) & (~t)) >>> 0;
    //     var t2 = ((t << 1) & (~t)) >>> 0;

    //     // top to bottom
    //     for (let jj=0; jj<chunkSize; jj++) {

    //       if ((t1 >> jj) & 1) {
    //         var ans = topFace(cubeSize, ii*cubeSize + i*c, (chunkSize-jj-1)*cubeSize + j*c, kk*cubeSize + k*c);
    //         indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
    //         voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
    //         vertices.push.apply(vertices, ans.vertices);
    //         normals.push.apply (normals,  ans.normals);
    //       }

    //       if ((t2 >> jj) & 1) {
    //         var ans = bottomFace(cubeSize, ii*cubeSize+ i*c, (chunkSize-jj)*cubeSize + j*c, kk*cubeSize + k*c);
    //         indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
    //         voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
    //         vertices.push.apply(vertices, ans.vertices);
    //         normals.push.apply (normals,  ans.normals);
    //       }

    //       if (jj==chunkSize-1) {
    //         if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
    //           var ans = topFace(cubeSize, ii*cubeSize + i*c, (chunkSize-jj-1)*cubeSize + (j+1)*c, kk*cubeSize + k*c);
    //           indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
    //           voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
    //           vertices.push.apply(vertices, ans.vertices);
    //           normals.push.apply (normals,  ans.normals);
    //       } }

    //       if (jj==0) {
    //         if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
    //           var ans = bottomFace(cubeSize, ii*cubeSize+ i*c, (chunkSize-jj)*cubeSize + (j-1)*c, kk*cubeSize + k*c);
    //           indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
    //           voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
    //           vertices.push.apply(vertices, ans.vertices);
    //           normals.push.apply (normals,  ans.normals);
    //       } }
    //     }
    // } }

    for (let jj=0; jj<chunkSize; jj++) {

      var a = [];

      for (let ii=0; ii<chunkSize; ii++) {
        for (let kk=0; kk<chunkSize; kk++) {
          a.push(arr[(ii*cc + jj*chunkSize + kk) + j*chunkSize*chunkSize*chunkSize]);
        }
      }

      for (let m=0; m<chunkSize; m++) {

        var t = parseInt(a.slice(m*chunkSize, (m+1)*chunkSize).join(''), 2);
        var t1 = ((t >>> 1) & (~t)) >>> 0;
        var t2 = ((t << 1) & (~t)) >>> 0;

        // top to bottom
        for (let w=0; w<chunkSize; w++) {

          if ((t1 >> w) & 1) {
            var ans = topFace(cubeSize, ii*cubeSize + i*c, (chunkSize-jj-1)*cubeSize + j*c, kk*cubeSize + k*c);
            indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
            vertices.push.apply(vertices, ans.vertices);
            normals.push.apply (normals,  ans.normals);
          }

          if ((t2 >> w) & 1) {
            var ans = bottomFace(cubeSize, ii*cubeSize+ i*c, (chunkSize-jj)*cubeSize + j*c, kk*cubeSize + k*c);
            indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
            vertices.push.apply(vertices, ans.vertices);
            normals.push.apply (normals,  ans.normals);
          }

          if (w==chunkSize-1) {
            if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
              var ans = topFace(cubeSize, ii*cubeSize + i*c, (chunkSize-jj-1)*cubeSize + (j+1)*c, kk*cubeSize + k*c);
              indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
              voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
              vertices.push.apply(vertices, ans.vertices);
              normals.push.apply (normals,  ans.normals);
          } }

          if (w==0) {
            if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
              var ans = bottomFace(cubeSize, ii*cubeSize+ i*c, (chunkSize-jj)*cubeSize + (j-1)*c, kk*cubeSize + k*c);
              indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
              voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
              vertices.push.apply(vertices, ans.vertices);
              normals.push.apply (normals,  ans.normals);
          } }
        }
      }
    }

    for (let ii=0; ii<chunkSize; ii++) {
      for (let jj=0; jj<chunkSize; jj++) {
        
        var a =[];
        for (let kk=0; kk<chunkSize; kk++)  {
          a.push(arr[(ii*cc + jj*chunkSize + kk) + j*chunkSize*chunkSize*chunkSize]);
        }

        var t = parseInt(a.join(''), 2);
        var t1 = ((t >>> 1) & (~t)) >>> 0;
        var t2 = ((t << 1) & (~t)) >>> 0;

        // front to back
        for (let kk=0; kk<chunkSize; kk++) {

          if ((t2 >> kk) & 1) {
            var ans = backFace(cubeSize, (ii)*cubeSize+ i*c, (jj)*cubeSize + j*c, (chunkSize-kk)*cubeSize + k*c);
            indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
            vertices.push.apply(vertices, ans.vertices);
            normals.push.apply (normals,  ans.normals);
          }

          if ((t1 >> kk) & 1) {
            var ans = frontFace(cubeSize, (ii)*cubeSize+ i*c, (jj)*cubeSize + j*c, (chunkSize-kk-1)*cubeSize + k*c);
            indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
            vertices.push.apply(vertices, ans.vertices);
            normals.push.apply (normals,  ans.normals);
          }

          if (kk==0) {
            if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
              var ans = backFace(cubeSize, (ii)*cubeSize+ i*c, (jj)*cubeSize + j*c, (chunkSize-kk)*cubeSize + (k-1)*c);
              indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
              vertices.push.apply(vertices, ans.vertices);
              normals.push.apply (normals,  ans.normals);
          } }

          if (kk==chunkSize-1) {
            if (arr[((ii*chunkSize + jj) * chunkSize + kk) + j*chunkSize*chunkSize*chunkSize] == 1) {
              var ans = frontFace(cubeSize, (ii)*cubeSize+ i*c, (jj)*cubeSize + j*c, (chunkSize-kk-1)*cubeSize + (k+1)*c);
              indices.push.apply (indices,  ans.indices.map(o=>o+vertices.length/3));
            voxelBordersIndices.push.apply (voxelBordersIndices, ans.wireframe.map(o=>o+vertices.length/3));
              vertices.push.apply(vertices, ans.vertices);
              normals.push.apply (normals,  ans.normals);
          } }
        }
    } }
  }
}

export { bindTerrain, initTerrain, getTerrainInfo, getChunksInfo, 
         initChunkBorders, bindChunkBorders, initVoxelWireframe, bindVoxelWireframe, 
         getVoxelWireframeInfo };
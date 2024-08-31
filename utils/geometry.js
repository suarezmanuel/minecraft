// function setCube(cubeSize, x, y, z) {

//   return [
//     // back face
//     x,       y+cubeSize,  z,
//     x+cubeSize,  y,       z,
//     x,       y,       z,

//     x,       y+cubeSize,  z,
//     x+cubeSize,  y+cubeSize,  z,
//     x+cubeSize,  y,       z,

//     // front face
//     x,       y+cubeSize,  z+cubeSize,
//     x,       y,       z+cubeSize,
//     x+cubeSize,  y,       z+cubeSize,

//     x,       y+cubeSize,  z+cubeSize,
//     x+cubeSize,  y,       z+cubeSize,
//     x+cubeSize,  y+cubeSize,  z+cubeSize,

//     // Left face
//     x,       y,       z,
//     x,       y,       z+cubeSize,
//     x,       y+cubeSize,  z,

//     x,       y,       z+cubeSize,
//     x,       y+cubeSize,  z+cubeSize,
//     x,       y+cubeSize,  z,

//     // Right face
//     x+cubeSize,  y,       z,
//     x+cubeSize,  y+cubeSize,  z,
//     x+cubeSize,  y,       z+cubeSize,

//     x+cubeSize,  y,       z+cubeSize,
//     x+cubeSize,  y+cubeSize,  z,
//     x+cubeSize,  y+cubeSize,  z+cubeSize,

//     // Top face
//     x,       y+cubeSize,  z,
//     x,       y+cubeSize,  z+cubeSize,
//     x+cubeSize,  y+cubeSize,  z,

//     x+cubeSize,  y+cubeSize,  z,
//     x,       y+cubeSize,  z+cubeSize,
//     x+cubeSize,  y+cubeSize,  z+cubeSize,

//     // Bottom face
//     x,       y,       z,
//     x+cubeSize,  y,       z,
//     x,       y,       z+cubeSize,

//     x+cubeSize,  y,       z,
//     x+cubeSize,  y,       z+cubeSize,
//     x,       y,       z+cubeSize
//   ];
// }

// function setNormals(gl, mapSize) {
//   var normals = [
//     // front
//     0,0,1,
//     0,0,1,
//     0,0,1,
//     0,0,1,
//     0,0,1,
//     0,0,1,

//     // back
//     0,0,-1,
//     0,0,-1,
//     0,0,-1,
//     0,0,-1,
//     0,0,-1,
//     0,0,-1,

//       // left
//     -1,0,0,
//     -1,0,0,
//     -1,0,0,
//     -1,0,0,
//     -1,0,0,
//     -1,0,0,

//     // right
//     1,0,0,
//     1,0,0,
//     1,0,0,
//     1,0,0,
//     1,0,0,
//     1,0,0,

//        // top
//     0,1,0,
//     0,1,0,
//     0,1,0,
//     0,1,0,
//     0,1,0,
//     0,1,0,

//     // bottom
//     0,-1,0,
//     0,-1,0,
//     0,-1,0,
//     0,-1,0,
//     0,-1,0,
//     0,-1,0];

//   var l = mapSize/108;
//   var dst = [];
//   // let dst = new Float32Array(length);

//   for (let i=0; i<l; i++) {
//     // dst.set(normals, i);
//     dst.push.apply(dst, normals);
//   }
//   // dst.push(1);
//   // console.log("in normals", dst.length);
//   // console.log(dst);

//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dst), gl.STATIC_DRAW);
// }

// async function setTerrain(gl, sampler, cubeSize, cubeCountX, cubeCountY, terrain) {

//   await sampler.init_sampler("./resources/perlin_noise.png");

//   // var terrain = [];
//   var percentage = 0;

//   for (let i=0; i < cubeCountX; i++) {
//     for (let j=0; j < cubeCountY; j++) {

//       var pixel = sampler.sample_pixel(i,j,0,1);
//       terrain.push.apply(terrain, setCube(cubeSize, i*cubeSize, pixel[0]*cubeSize, j*cubeSize));
//     }
//   }

//   for (let i=0; i < cubeCountX; i++) {
//     for (let j=0; j < cubeCountY; j++) {

//       var pixel = sampler.sample_pixel(i,j,0,1);
//       var height = pixel[0]*cubeSize;
//       var heightU = height;
//       var heightD = height;
//       var heightL = height;
//       var heightR = height;

//       if (i > 0) { heightU = terrain[(i-1)*cubeCountX + j] }
//       if (j > 0) { heightD = terrain[(i+1)*cubeCountX + j] }
//       if (i < cubeCountX-1) { heightL = terrain[i*cubeCountX + j-1] }
//       if (j < cubeCountY-1) { heightR = terrain[i*cubeCountX + j+1] }

//       var diff = (height - Math.min(heightU, heightD, heightL, heightR)) / cubeSize;

//       terrain.push.apply(terrain, setCube(cubeSize, i*cubeSize, height, j*cubeSize));

//       for (let k=0; k < diff; k++) {
//         terrain.push.apply(terrain, setCube(cubeSize, i*cubeSize, (height/cubeSize-k)*cubeSize, j*cubeSize));
//       }
//     }
//     console.log("generating terrain", percentage++, "/", cubeCountX);
//   }

//   // console.log("in terrain gen", length);
//   // console.log(terrain.length / length);
//   // we cant optimize by initializing the arr beforehand, becaues we dont know diffs
// //   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrain), gl.STATIC_DRAW);
//   console.log("terrain generated");
// //   return terrain;
// }

// export { setCube, setNormals, setTerrain };
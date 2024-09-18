function backFace(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 0, 2, 3],
    wireframe:
      [0,1, 1,2, 2,0, 0,2, 2,3],
    normals:
      [0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1],
    vertices:
      [
        x + cubeSize, y + cubeSize, z,
        x + cubeSize, y, z,
        x, y, z,
        x, y + cubeSize, z
      ]
  }
}

function backFaceStretch(length, height, x, y, z) {

  return {
    indices:
      [0, 1, 2, 0, 2, 3],
    wireframe:
      [0,1, 1,2, 2,0, 0,2, 2,3],
    normals:
      [0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1],
    vertices:
      [
        x + height, y + length, z,
        x + height, y, z,
        x, y, z,
        x, y + length, z
      ]
  }
}

function frontFace(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 0, 2, 3],
    wireframe:
      [0,1, 1,2, 2,0, 0,2, 2,3],
    normals:
      [0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1],
    vertices:
      [
        x, y + cubeSize, z,
        x, y, z,
        x + cubeSize, y, z,
        x + cubeSize, y + cubeSize, z,
      ]
  }
}

function frontFaceStretch(length, height, x, y, z) {

  return {
    indices:
      [0, 1, 2, 0, 2, 3],
    wireframe:
      [0,1, 1,2, 2,0, 0,2, 2,3],
    normals:
      [0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1],
    vertices:
      [
        x, y + length, z,
        x, y, z,
        x + height, y, z,
        x + height, y + length, z,
      ]
  }
}

function leftFace(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [-1, 0, 0,
      -1, 0, 0,
      -1, 0, 0,
      -1, 0, 0],
    vertices:
      [
        x, y, z,
        x, y, z + cubeSize,
        x, y + cubeSize, z,
        x, y + cubeSize, z + cubeSize,
      ]
  }
}

function leftFaceStretch(length, height, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [-1, 0, 0,
      -1, 0, 0,
      -1, 0, 0,
      -1, 0, 0],
    vertices:
      [
        x, y, z,
        x, y, z + length,
        x, y + height, z,
        x, y + height, z + length,
      ]
  }
}

function rightFace(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0],
    vertices:
      [
        x, y, z,
        x, y + cubeSize, z,
        x, y, z + cubeSize,
        x, y + cubeSize, z + cubeSize,
      ]
  }
}

function rightFaceStretch(length, height, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0],
    vertices:
      [
        x, y, z,
        x, y + height, z,
        x, y, z + length,
        x, y + height, z + length,
      ]
  }
}

function topFace(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0],
    vertices:
      [
        x, y, z,
        x, y, z + cubeSize,
        x + cubeSize, y, z,
        x + cubeSize, y, z + cubeSize,
      ]
  }
}

// length is in the Z axis, height in the X axis
function topFaceStretch(length, height, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [0, 1, 0,
       0, 1, 0,
       0, 1, 0,
       0, 1, 0],
    vertices:
      [
        x, y, z,
        x, y, z + length,
        x + height, y, z,
        x + height, y, z + length,
      ]
  }
}

function bottomFace(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,],
    vertices:
      [
        x, y, z,
        x + cubeSize, y, z,
        x, y, z + cubeSize,
        x + cubeSize, y, z + cubeSize,
      ]
  }
}

function bottomFaceStretch(length, height, x, y, z) {

  return {
    indices:
      [0, 1, 2, 1, 3, 2],
    wireframe:
      [0,1, 1,2, 2,1, 1,3, 3,2],
    normals:
      [0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,],
    vertices:
      [
        x, y, z,
        x + height, y, z,
        x, y, z + length,
        x + height, y, z + length,
      ]
  }
}

function setCube(cubeSize, x, y, z) {

  return {
    indices:
      [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 9, 11, 10, 12, 13, 14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22],
    normals:
      [
        // back
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,

        // front
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        // left
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,

        // right
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        // top
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        // bottom
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0
      ],
    vertices:
      [
        x + cubeSize, y + cubeSize, z,
        x + cubeSize, y, z,
        x, y, z,
        x, y + cubeSize, z,

        x, y + cubeSize, z + cubeSize,
        x, y, z + cubeSize,
        x + cubeSize, y, z + cubeSize,
        x + cubeSize, y + cubeSize, z + cubeSize,

        x, y, z,
        x, y, z + cubeSize,
        x, y + cubeSize, z,
        x, y + cubeSize, z + cubeSize,

        x + cubeSize, y, z,
        x + cubeSize, y + cubeSize, z,
        x + cubeSize, y, z + cubeSize,
        x + cubeSize, y + cubeSize, z + cubeSize,

        x, y + cubeSize, z,
        x, y + cubeSize, z + cubeSize,
        x + cubeSize, y + cubeSize, z,
        x + cubeSize, y + cubeSize, z + cubeSize,

        x, y, z,
        x + cubeSize, y, z,
        x, y, z + cubeSize,
        x + cubeSize, y, z + cubeSize,
      ]
  }
}

function setCubeWireFrame(cubeSize, x, y, z) {

  return {
    indices:
      [0,1,1,2,2,3,3,0,  4,5,5,6,6,7,7,4, 0,4, 1,5, 2,6, 3,7],
    vertices:
      [
        x, y+cubeSize, z,
        x, y,z,
        x+cubeSize ,y, z,
        x+cubeSize, y+cubeSize, z,

        x, y+cubeSize, z+cubeSize,
        x, y,z+cubeSize,
        x+cubeSize ,y, z+cubeSize,
        x+cubeSize, y+cubeSize, z+cubeSize,
      ]
  }
}

export { backFace, backFaceStretch, frontFace, frontFaceStretch, leftFace, leftFaceStretch, rightFace, rightFaceStretch, topFace, topFaceStretch, bottomFace, bottomFaceStretch, setCube, setCubeWireFrame };
async function setTerrain(gl, obj) {
  // Create a buffer to put positions in
  obj.positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.positionBuffer);
  await setChunk(gl, sampler,0,0);

  obj.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

  obj.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  return obj;
}
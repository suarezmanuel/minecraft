async function getShaderContent(name) {

  try {

    const response = await fetch(`${name}`);
    if (!response.ok) {
      throw new Error(`http error, status: ${response.status}`);
    }
    const shaderSource = await response.text();
    return shaderSource;

  } catch (error) {
    console.log("error fetching shader source:", error);
  }
}

async function createProgramFromFiles(gl, url1, url2) {

  const vertexShader = await getShaderContent(url1);
  const fragmentShader = await getShaderContent(url2);
  return webglUtils.createProgramFromSources(gl, [vertexShader, fragmentShader]);
}


export { createProgramFromFiles };
attribute vec4 a_position;
uniform mat4 u_viewMatrixProjection;

void main() {
    gl_Position = u_viewMatrixProjection * a_position;
}
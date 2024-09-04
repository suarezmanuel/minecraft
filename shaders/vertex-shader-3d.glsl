attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrixProjection;
varying vec3 v_normal;

void main() {

    gl_Position = u_viewMatrixProjection * a_position;
    v_normal = a_normal * mat3(u_worldMatrix);
}
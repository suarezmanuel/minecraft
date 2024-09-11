attribute vec4 a_position;
attribute vec4 a_color;

uniform vec4 camera_pos;
uniform mat4 u_viewMatrixProjection;
varying vec4 v_color;

void main () {

    vec4 pos = (u_viewMatrixProjection * (a_position + camera_pos));
    pos.y *= 0.09;
    pos.xz *= 0.05;
    gl_Position = pos;
    v_color = a_color;
}
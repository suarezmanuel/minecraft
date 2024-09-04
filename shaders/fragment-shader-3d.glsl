precision mediump float;

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;
varying vec3 v_normal;

void main() {

    vec3 normal = normalize(v_normal);

    // light in [0,1]
    float light = dot(normal, u_reverseLightDirection);
    gl_FragColor = u_color;

    gl_FragColor.rgb *= light;
}
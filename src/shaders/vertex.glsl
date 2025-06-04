attribute vec2 a_position;
attribute vec2 a_instancePosition;
attribute vec4 a_instanceColor;
attribute float a_instanceSize;

uniform mat4 u_matrix;
uniform float u_zoom;

varying vec4 v_color;

void main() {
    // 计算实例化位置
    vec2 position = a_position * a_instanceSize + a_instancePosition;
    
    // 应用变换矩阵
    gl_Position = u_matrix * vec4(position, 0.0, 1.0);
    
    // 传递颜色到片元着色器
    v_color = a_instanceColor;
} 
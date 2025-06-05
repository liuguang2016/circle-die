precision highp float;

varying vec4 v_color;
varying vec2 v_position;

void main() {
    // 计算到方块边缘的距离
    vec2 center = vec2(0.0, 0.0);
    vec2 toCenter = abs(v_position);
    
    // 边缘平滑度因子 (值越大，边缘越平滑)
    float smoothFactor = 0.05;
    
    // 计算平滑因子
    float distToEdge = max(toCenter.x, toCenter.y);
    float alpha = 1.0 - smoothstep(0.5 - smoothFactor, 0.5, distToEdge);
    
    // 应用平滑边缘
    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
} 
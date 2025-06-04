import { MathUtils } from '../utils/math.js';

/**
 * 相机控制类
 */
export class Camera {
    /**
     * 构造函数
     * @param {HTMLCanvasElement} canvas - Canvas元素
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.position = { x: 0, y: 0 };
        this.zoom = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 10.0;
        this.matrix = new Float32Array(16);
        this.updateMatrix();
        
        // 保存初始状态用于重置
        this.initialState = {
            position: { ...this.position },
            zoom: this.zoom
        };
    }

    /**
     * 更新变换矩阵
     */
    updateMatrix() {
        // 计算正交投影矩阵
        const aspect = this.canvas.width / this.canvas.height;
        const height = 1000 / this.zoom;
        const width = height * aspect;
        
        const left = -width / 2;
        const right = width / 2;
        const bottom = -height / 2;
        const top = height / 2;
        
        const projectionMatrix = MathUtils.ortho(left, right, bottom, top, -1, 1);
        
        // 计算视图矩阵
        const translationMatrix = MathUtils.translation(-this.position.x, -this.position.y, 0);
        
        // 组合矩阵: 投影 * 视图
        this.matrix = MathUtils.multiplyMatrix(projectionMatrix, translationMatrix);
    }

    /**
     * 缩放相机
     * @param {number} delta - 缩放增量
     */
    zoomCamera(delta) {
        // 应用缩放
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        this.updateMatrix();
        
        // 更新UI显示
        document.getElementById('zoomLevel').textContent = this.zoom.toFixed(2);
    }

    /**
     * 平移相机
     * @param {number} deltaX - X轴平移增量
     * @param {number} deltaY - Y轴平移增量
     */
    pan(deltaX, deltaY) {
        // 根据缩放级别调整平移速度
        const factor = 1.0 / this.zoom;
        this.position.x -= deltaX * factor;
        this.position.y += deltaY * factor; // Y轴反转
        this.updateMatrix();
    }

    /**
     * 重置相机到初始状态
     */
    reset() {
        this.position = { ...this.initialState.position };
        this.zoom = this.initialState.zoom;
        this.updateMatrix();
        
        // 更新UI显示
        document.getElementById('zoomLevel').textContent = this.zoom.toFixed(2);
    }

    /**
     * 获取视口边界
     * @returns {Object} 视口边界 {left, right, top, bottom}
     */
    getViewBounds() {
        const aspect = this.canvas.width / this.canvas.height;
        const height = 1000 / this.zoom;
        const width = height * aspect;
        
        return {
            left: this.position.x - width / 2,
            right: this.position.x + width / 2,
            top: this.position.y + height / 2,
            bottom: this.position.y - height / 2
        };
    }

    /**
     * 获取当前缩放级别
     * @returns {number} 缩放级别
     */
    getZoomLevel() {
        return this.zoom;
    }
} 
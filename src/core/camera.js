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

    // 增加平移速度控制参数
    this.panSpeed = 0.25; // 降低平移速度系数

    // 增加平移边界限制
    this.panLimit = 10000;

    // 增加平移平滑参数
    this.smoothing = true;
    this.smoothFactor = 0.2; // 值越小，移动越平滑
    this.targetPosition = { x: 0, y: 0 };
    this.lastGoodMatrix = null; // 存储最后一个有效的矩阵

    // 设置默认矩阵为单位矩阵，防止初始化阶段出错
    this.setIdentityMatrix();

    // 尝试更新矩阵
    try {
      this.updateMatrix();
      // 存储第一个有效矩阵
      this.lastGoodMatrix = new Float32Array(this.matrix);
    } catch (error) {
      console.error("相机矩阵初始化失败:", error);
      // 失败时保持单位矩阵
    }

    // 保存初始状态用于重置
    this.initialState = {
      position: { ...this.position },
      zoom: this.zoom,
    };
  }

  /**
   * 设置单位矩阵
   */
  setIdentityMatrix() {
    this.matrix = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
  }

  /**
   * 更新变换矩阵
   */
  updateMatrix() {
    try {
      // 确保canvas有效
      if (!this.canvas || !this.canvas.width || !this.canvas.height) {
        throw new Error("Canvas无效或尺寸为零");
      }

      // 确保缩放值有效
      if (!isFinite(this.zoom) || this.zoom <= 0) {
        this.zoom = this.minZoom;
        console.warn("缩放值无效，重置为最小值");
      }

      // 计算正交投影矩阵
      const aspect = this.canvas.width / this.canvas.height || 1; // 防止除以零
      const height = 1000 / this.zoom;
      const width = height * aspect;

      const left = -width / 2;
      const right = width / 2;
      const bottom = -height / 2;
      const top = height / 2;

      // 确保投影参数有效
      if ([left, right, bottom, top].some((val) => !isFinite(val))) {
        throw new Error("投影参数计算错误");
      }

      const projectionMatrix = MathUtils.ortho(left, right, bottom, top, -1, 1);

      // 确保位置坐标有效
      if (!isFinite(this.position.x) || !isFinite(this.position.y)) {
        this.position = { ...this.initialState.position };
        console.warn("位置坐标无效，重置为初始值");
      }

      // 计算视图矩阵
      const translationMatrix = MathUtils.translation(
        -this.position.x,
        -this.position.y,
        0
      );

      // 组合矩阵: 投影 * 视图
      const result = MathUtils.multiplyMatrix(
        projectionMatrix,
        translationMatrix
      );

      // 验证结果矩阵是否有效
      if (result.some((val) => !isFinite(val))) {
        throw new Error("矩阵计算结果无效");
      }

      // 存储新的有效矩阵
      this.matrix = result;
      this.lastGoodMatrix = new Float32Array(result);

      return true; // 更新成功
    } catch (error) {
      console.error("更新相机矩阵失败:", error);
      // 出错时使用最后一个有效矩阵（如果有）
      if (this.lastGoodMatrix) {
        console.log("恢复到最后一个有效矩阵");
        this.matrix = new Float32Array(this.lastGoodMatrix);
      } else {
        // 否则使用单位矩阵
        this.setIdentityMatrix();
      }
      return false;
    }
  }

  /**
   * 缩放相机
   * @param {number} delta - 缩放增量
   */
  zoomCamera(delta) {
    try {
      // 验证增量是否有效
      if (!isFinite(delta)) {
        console.warn("缩放增量无效:", delta);
        return;
      }

      // 限制单次缩放的最大变化量
      const boundedDelta = Math.max(-0.5, Math.min(0.5, delta));

      // 应用缩放
      const oldZoom = this.zoom;
      this.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.zoom + boundedDelta)
      );

      // 更新矩阵
      const success = this.updateMatrix();

      // 如果更新失败，恢复原来的缩放值
      if (!success) {
        this.zoom = oldZoom;
        return;
      }

      // 更新UI显示
      const zoomElement = document.getElementById("zoomLevel");
      if (zoomElement) {
        zoomElement.textContent = this.zoom.toFixed(2);
      }
    } catch (error) {
      console.error("缩放相机失败:", error);
    }
  }

  /**
   * 平移相机
   * @param {number} deltaX - X轴平移增量
   * @param {number} deltaY - Y轴平移增量
   */
  pan(deltaX, deltaY) {
    try {
      // 验证增量是否有效
      if (!isFinite(deltaX) || !isFinite(deltaY)) {
        console.warn("平移增量无效:", deltaX, deltaY);
        return;
      }

      // 保存原来的位置，以便回滚
      const oldPosition = { ...this.position };

      // 应用平移速度
      deltaX *= this.panSpeed;
      deltaY *= this.panSpeed;

      // 根据缩放级别调整平移速度
      // 在高缩放级别下减少移动速度，在低缩放级别下增加移动速度
      const zoomFactor = Math.log(Math.max(0.5, this.zoom)) * 0.5;
      const factor = zoomFactor / Math.max(0.1, this.zoom);

      if (this.smoothing) {
        // 平滑模式：更新目标位置
        this.targetPosition.x -= deltaX * factor;
        this.targetPosition.y += deltaY * factor; // Y轴反转

        // 平滑插值
        this.position.x +=
          (this.targetPosition.x - this.position.x) * this.smoothFactor;
        this.position.y +=
          (this.targetPosition.y - this.position.y) * this.smoothFactor;
      } else {
        // 直接模式：立即更新位置
        this.position.x -= deltaX * factor;
        this.position.y += deltaY * factor; // Y轴反转
      }

      // 设置平移边界限制
      this.position.x = Math.max(
        -this.panLimit,
        Math.min(this.panLimit, this.position.x)
      );
      this.position.y = Math.max(
        -this.panLimit,
        Math.min(this.panLimit, this.position.y)
      );

      // 同步目标位置，避免超出边界后的弹回效果
      this.targetPosition.x = Math.max(
        -this.panLimit,
        Math.min(this.panLimit, this.targetPosition.x)
      );
      this.targetPosition.y = Math.max(
        -this.panLimit,
        Math.min(this.panLimit, this.targetPosition.y)
      );

      // 防止位置值变为NaN
      if (isNaN(this.position.x) || isNaN(this.position.y)) {
        this.position = { ...oldPosition };
        this.targetPosition = { ...oldPosition };
        console.warn("平移导致位置值无效，回滚到上一个有效位置");
      }

      // 更新矩阵
      const success = this.updateMatrix();

      // 如果更新失败，恢复原来的位置
      if (!success) {
        this.position = { ...oldPosition };
        this.targetPosition = { ...oldPosition };
      }
    } catch (error) {
      console.error("平移相机失败:", error);
    }
  }

  /**
   * 重置相机到初始状态
   */
  reset() {
    try {
      this.position = { ...this.initialState.position };
      this.targetPosition = { ...this.initialState.position }; // 同时重置目标位置
      this.zoom = this.initialState.zoom;

      // 更新矩阵
      this.updateMatrix();

      // 更新UI显示
      const zoomElement = document.getElementById("zoomLevel");
      if (zoomElement) {
        zoomElement.textContent = this.zoom.toFixed(2);
      }
    } catch (error) {
      console.error("重置相机失败:", error);
      // 尝试设置为默认值
      this.position = { x: 0, y: 0 };
      this.targetPosition = { x: 0, y: 0 };
      this.zoom = 1.0;
      this.setIdentityMatrix();
    }
  }

  /**
   * 获取视口边界
   * @returns {Object} 视口边界 {left, right, top, bottom}
   */
  getViewBounds() {
    try {
      // 确保canvas有效
      if (!this.canvas || !this.canvas.width || !this.canvas.height) {
        return { left: -500, right: 500, top: 500, bottom: -500 }; // 默认视口
      }

      const aspect = this.canvas.width / this.canvas.height || 1; // 防止除以零
      const height = 1000 / Math.max(0.1, this.zoom); // 防止除以接近零的数
      const width = height * aspect;

      return {
        left: this.position.x - width / 2,
        right: this.position.x + width / 2,
        top: this.position.y + height / 2,
        bottom: this.position.y - height / 2,
      };
    } catch (error) {
      console.error("获取视口边界失败:", error);
      // 返回默认视口
      return { left: -500, right: 500, top: 500, bottom: -500 };
    }
  }

  /**
   * 获取当前缩放级别
   * @returns {number} 缩放级别
   */
  getZoomLevel() {
    return this.zoom;
  }

  /**
   * 设置平移平滑度
   * @param {boolean} enable - 是否启用平滑
   * @param {number} factor - 平滑因子 (0-1)
   */
  setSmoothPanning(enable, factor = 0.2) {
    this.smoothing = enable;
    if (isFinite(factor) && factor > 0 && factor <= 1) {
      this.smoothFactor = factor;
    }
  }
} 
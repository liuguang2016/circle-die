import { Renderer } from './core/renderer.js';
import { Camera } from './core/camera.js';
import { TileManager } from './utils/tile-manager.js';
import { CircleGrid } from './models/circle-grid.js';

// 添加全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.message, 'at', event.filename, ':', event.lineno);
});

/**
 * 主应用类
 */
class CircleRenderer {
    /**
     * 构造函数
     */
    constructor() {
        console.log('开始初始化CircleRenderer');
        
        try {
            // 获取DOM元素
            this.canvas = document.querySelector("#renderCanvas");
            if (!this.canvas) {
              throw new Error("找不到canvas元素");
            }
            console.log("Canvas元素获取成功", this.canvas);

            // 确保canvas有初始宽高
            this.setupCanvasSize();
            
            // 显示加载中信息
            this.showLoadingMessage("正在初始化渲染器...");
            
            // 延迟初始化以允许UI更新
            setTimeout(() => this.delayedInit(), 100);
        } catch (error) {
            console.error('初始化错误:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * 设置Canvas尺寸
     */
    setupCanvasSize() {
        // 获取设备像素比
        const pixelRatio = window.devicePixelRatio || 1;
        
        // 获取容器尺寸
        const containerWidth = this.canvas.clientWidth;
        const containerHeight = this.canvas.clientHeight;
        
        console.log(`Canvas容器尺寸: ${containerWidth} x ${containerHeight}, 设备像素比: ${pixelRatio}`);
        
        // 设置canvas尺寸，应用设备像素比以提高渲染清晰度
        this.canvas.width = containerWidth * pixelRatio;
        this.canvas.height = containerHeight * pixelRatio;
        
        console.log(`Canvas尺寸设置为: ${this.canvas.width} x ${this.canvas.height}`);
        
        // 监听窗口大小变化，调整canvas尺寸
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    /**
     * 调整Canvas尺寸
     */
    resizeCanvas() {
        // 获取设备像素比
        const pixelRatio = window.devicePixelRatio || 1;
        
        // 获取容器尺寸
        const containerWidth = this.canvas.clientWidth;
        const containerHeight = this.canvas.clientHeight;
        
        // 设置canvas尺寸，应用设备像素比以提高渲染清晰度
        this.canvas.width = containerWidth * pixelRatio;
        this.canvas.height = containerHeight * pixelRatio;
        
        console.log(`Canvas尺寸调整为: ${this.canvas.width} x ${this.canvas.height}`);
    }
    
    /**
     * 延迟初始化
     */
    delayedInit() {
        try {
            // 初始化组件
            console.log('初始化Renderer');
            this.renderer = new Renderer(this.canvas);
            
            console.log('初始化Camera');
            this.camera = new Camera(this.canvas);
            
            this.showLoadingMessage("正在生成圆形网格...");
            
            // 使用Worker来生成网格，避免阻塞主线程
            this.initCircleGrid();
        } catch (error) {
            console.error('延迟初始化错误:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * 初始化圆形网格
     */
    initCircleGrid() {
        try {
            console.log('初始化CircleGrid');
            this.circleGrid = new CircleGrid(500); // 半径500
            
            this.showLoadingMessage("正在构建瓦片系统...");
            
            console.log('初始化TileManager');
            this.tileManager = new TileManager(this.circleGrid, this.camera);
            
            // 更新坏数据统计
            this.updateBadDataStats();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 启动渲染循环
            console.log('启动渲染循环');
            // 使用requestAnimationFrame启动渲染循环
            this.lastFrameTime = performance.now();
            this.animate();
            
            console.log('圆形渲染器初始化完成');
        } catch (error) {
            console.error('网格初始化错误:', error);
            this.showError(error.message);
        }
    }
    
    /**
     * 更新坏数据统计
     */
    updateBadDataStats() {
        if (this.circleGrid && this.circleGrid.blocks) {
            let badDataCount = 0;
            for (const block of this.circleGrid.blocks) {
                if (block.isBadData) {
                    badDataCount++;
                }
            }
            
            const totalBlocks = this.circleGrid.blocks.length;
            const badDataPercentage = ((badDataCount / totalBlocks) * 100).toFixed(2);
            
            // 更新UI显示
            const badDataCountElement = document.getElementById("badDataCount");
            if (badDataCountElement) {
                badDataCountElement.textContent = `${badDataCount} (${badDataPercentage}%)`;
            }
        }
    }
    
    /**
     * 显示加载消息
     * @param {string} message - 加载消息
     */
    showLoadingMessage(message) {
        // 避免在已经获取过WebGL上下文后再获取2D上下文
        if (this.renderer && this.renderer.gl) {
            console.log('WebGL上下文已存在，跳过2D加载消息');
            return;
        }
        
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            // 获取设备像素比
            const pixelRatio = window.devicePixelRatio || 1;
            
            // 清除画布
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 调整字体大小以适应高DPI屏幕
            const fontSize = 20 * pixelRatio;
            
            // 绘制加载消息
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
            
            // 绘制加载进度条
            const barWidth = 200 * pixelRatio;
            const barHeight = 10 * pixelRatio;
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(this.canvas.width / 2 - barWidth / 2, this.canvas.height / 2 + fontSize + 10, barWidth, barHeight);
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(this.canvas.width / 2 - barWidth / 2, this.canvas.height / 2 + fontSize + 10, barWidth * Math.random(), barHeight);
        }
    }
    
    /**
     * 显示错误消息
     * @param {string} error - 错误消息
     */
    showError(error) {
        // 避免在已经获取过WebGL上下文后再获取2D上下文
        if (this.renderer && this.renderer.gl) {
            console.error('错误:', error);
            return;
        }
        
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            // 获取设备像素比
            const pixelRatio = window.devicePixelRatio || 1;
            
            // 清除画布
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 调整字体大小以适应高DPI屏幕
            const fontSize = 20 * pixelRatio;
            const smallFontSize = 16 * pixelRatio;
            
            // 绘制错误消息
            ctx.fillStyle = '#ff5252';
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('初始化失败: ' + error, this.canvas.width / 2, this.canvas.height / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = `${smallFontSize}px Arial`;
            ctx.fillText('请检查控制台获取详细信息', this.canvas.width / 2, this.canvas.height / 2 + fontSize + 10);
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
      // 缩放控制
      this.canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        try {
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          this.camera.zoomCamera(delta);
        } catch (error) {
          console.error("缩放错误:", error);
        }
      });

      // 平移控制
      let isDragging = false;
      let lastPosition = { x: 0, y: 0 };
      let lastMoveTime = 0;

      // 防止拖动时鼠标快速移动导致的问题
      const safePan = (deltaX, deltaY) => {
        try {
          // 防止连续调用导致的性能问题
          const now = performance.now();
          if (now - lastMoveTime < 16) {
            // 限制约60fps的处理频率
            return;
          }
          lastMoveTime = now;

          // 限制单次平移的最大值，防止因过大的值导致矩阵计算异常
          const maxDelta = 30; // 降低单次最大平移量
          const boundedDeltaX = Math.max(-maxDelta, Math.min(maxDelta, deltaX));
          const boundedDeltaY = Math.max(-maxDelta, Math.min(maxDelta, deltaY));

          // 如果增量几乎为零，可以跳过
          if (Math.abs(boundedDeltaX) < 0.5 && Math.abs(boundedDeltaY) < 0.5) {
            return;
          }

          this.camera.pan(boundedDeltaX, boundedDeltaY);
        } catch (error) {
          console.error("平移错误:", error);
          // 出错时自动重置拖动状态
          isDragging = false;
          this.canvas.style.cursor = "grab";
        }
      };

      this.canvas.addEventListener("mousedown", (e) => {
        e.preventDefault(); // 防止文本选择等默认行为

        // 确保初始化lastMoveTime
        lastMoveTime = performance.now();

        // 启用平滑平移 (需要在拖动开始时启用)
        this.camera.setSmoothPanning(true, 0.15); // 降低平滑因子，使移动更平滑

        isDragging = true;
        lastPosition = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = "grabbing";
      });

      const handleMouseMove = (e) => {
        if (isDragging) {
          // 计算移动增量
          const deltaX = e.clientX - lastPosition.x;
          const deltaY = e.clientY - lastPosition.y;

          // 使用安全平移函数
          safePan(deltaX, deltaY);

          // 更新上一次位置
          lastPosition = { x: e.clientX, y: e.clientY };
        }
      };

      // 使用document而不是window来捕获所有鼠标移动
      document.addEventListener("mousemove", handleMouseMove);

      // 处理鼠标释放，即使在canvas外
      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          this.canvas.style.cursor = "grab";

          // 释放鼠标时，关闭平滑平移
          this.camera.setSmoothPanning(false);
        }
      };

      document.addEventListener("mouseup", handleMouseUp);

      // 处理鼠标离开窗口的情况
      document.addEventListener("mouseleave", handleMouseUp);

      // 处理失去焦点的情况
      window.addEventListener("blur", handleMouseUp);

      // 重置视图按钮
      document.getElementById("resetView").addEventListener("click", () => {
        try {
          this.camera.reset();
        } catch (error) {
          console.error("重置视图错误:", error);
        }
      });

      // 设置默认鼠标样式
      this.canvas.style.cursor = "grab";
    }
    
    /**
     * 渲染循环
     */
    animate() {
        try {
            // 计算帧率限制
            const now = performance.now();
            const elapsed = now - this.lastFrameTime;
            this.lastFrameTime = now;
            
            // 检查渲染器状态
            if (this.renderer && this.renderer.gl && this.renderer.gl.isContextLost && this.renderer.gl.isContextLost()) {
                // WebGL上下文丢失，等待恢复
                console.warn("WebGL上下文已丢失，等待恢复...");
                // 继续尝试渲染，WebGL上下文可能会自动恢复
                this.animationFrameId = requestAnimationFrame(() => this.animate());
                return;
            }
            
            // 获取可见瓦片
            const visibleTiles = this.tileManager ? this.tileManager.getVisibleTiles() : [];
            
            // 渲染瓦片
            if (this.renderer && visibleTiles.length > 0) {
                try {
                    this.renderer.render(visibleTiles, this.camera);
                } catch (renderError) {
                    console.error('渲染错误:', renderError);
                    
                    // 检查是否是WebGL上下文丢失
                    if (this.renderer.gl && this.renderer.gl.isContextLost && this.renderer.gl.isContextLost()) {
                        console.warn("检测到WebGL上下文丢失");
                    } else {
                        // 其他错误，尝试更新相机矩阵
                        this.camera.updateMatrix();
                    }
                }
            }
            
            // 继续下一帧
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } catch (error) {
            console.error('渲染循环错误:', error);
            // 尝试继续渲染，避免完全崩溃
            setTimeout(() => {
                this.animationFrameId = requestAnimationFrame(() => this.animate());
            }, 1000);
        }
    }
}

// 确保DOM完全加载后初始化应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// 初始化应用
function initApp() {
    try {
        console.log('DOM已加载，初始化应用');
        const app = new CircleRenderer();
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
} 
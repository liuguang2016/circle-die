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
            if (!this.canvas.width || !this.canvas.height) {
              console.log("Canvas尺寸未设置，设置初始尺寸");
              this.canvas.width = this.canvas.clientWidth || 800;
              this.canvas.height = this.canvas.clientHeight || 600;
            }
            
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
            // 清除画布
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制加载消息
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
            
            // 绘制加载进度条
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(this.canvas.width / 2 - 100, this.canvas.height / 2 + 20, 200, 10);
            ctx.fillStyle = '#4a90e2';
            ctx.fillRect(this.canvas.width / 2 - 100, this.canvas.height / 2 + 20, 200 * Math.random(), 10);
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
            // 清除画布
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制错误消息
            ctx.fillStyle = '#ff5252';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('初始化失败: ' + error, this.canvas.width / 2, this.canvas.height / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.fillText('请检查控制台获取详细信息', this.canvas.width / 2, this.canvas.height / 2 + 30);
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 缩放控制
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.camera.zoomCamera(delta);
        });
        
        // 平移控制
        let isDragging = false;
        let lastPosition = { x: 0, y: 0 };
        
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastPosition = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - lastPosition.x;
                const deltaY = e.clientY - lastPosition.y;
                this.camera.pan(deltaX, deltaY);
                lastPosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
            this.canvas.style.cursor = 'grab';
        });
        
        // 重置视图按钮
        document.getElementById('resetView').addEventListener('click', () => {
            this.camera.reset();
        });
        
        // 颜色模式切换按钮
        document.getElementById('toggleColor').addEventListener('click', () => {
            const newMode = this.circleGrid.toggleColorMode();
            console.log(`切换颜色模式: ${newMode}`);
            this.tileManager.rebuildTiles();
        });
        
        // 鼠标悬停效果
        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) {
                this.canvas.style.cursor = 'grab';
            }
        });
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
            
            // 获取可见瓦片
            const visibleTiles = this.tileManager.getVisibleTiles();
            
            // 渲染瓦片
            this.renderer.render(visibleTiles, this.camera);
            
            // 继续下一帧
            requestAnimationFrame(() => this.animate());
        } catch (error) {
            console.error('渲染循环错误:', error);
            // 尝试继续渲染，避免完全崩溃
            setTimeout(() => requestAnimationFrame(() => this.animate()), 1000);
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
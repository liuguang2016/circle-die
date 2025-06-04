import { MathUtils } from '../utils/math.js';

/**
 * 圆形网格生成类
 */
export class CircleGrid {
    /**
     * 构造函数
     * @param {number} radius - 圆形半径
     */
    constructor(radius) {
        try {
            console.log('CircleGrid初始化开始', radius);
            this.radius = radius;
            this.blocks = []; // 所有方块
            
            // 调整初始方块大小，使总数不超过70万个
            const maxBlocks = 900000;
            // 计算得到的方块大小
            const estimatedBlockCount = Math.PI * radius * radius;
            this.blockSize = Math.max(1.0, Math.sqrt(estimatedBlockCount / maxBlocks));
            console.log(`估计方块数量: ${estimatedBlockCount}, 设置方块大小: ${this.blockSize}`);
            
            this.colorMode = 'rainbow'; // 颜色模式: 'rainbow', 'distance', 'angle'
            console.log('CircleGrid初始化完成');
        } catch (error) {
            console.error('CircleGrid初始化失败:', error);
            // 设置默认值以确保程序能继续运行
            this.radius = radius || 500;
            this.blockSize = 5.0;
            this.blocks = [];
            this.colorMode = 'rainbow';
        }
    }

    /**
     * 生成圆形网格
     */
    generate() {
        try {
            console.log('开始生成圆形网格, 方块大小:', this.blockSize);
            // 计算每行每列的方块数量
            const diameter = this.radius * 2;
            const gridSize = Math.ceil(diameter / this.blockSize);
            
            console.log(`网格尺寸: ${gridSize}x${gridSize}`);
            
            this.blocks = [];
            
            // 中心坐标
            const centerX = 0;
            const centerY = 0;
            
            // 生成所有方块
            let count = 0;
            for (let y = -gridSize / 2; y < gridSize / 2; y++) {
                for (let x = -gridSize / 2; x < gridSize / 2; x++) {
                    // 计算方块中心坐标
                    const blockX = x * this.blockSize + this.blockSize / 2;
                    const blockY = y * this.blockSize + this.blockSize / 2;
                    
                    // 计算到圆心的距离
                    const distance = Math.sqrt(
                        Math.pow(blockX - centerX, 2) + 
                        Math.pow(blockY - centerY, 2)
                    );
                    
                    // 如果在圆内，添加方块
                    if (distance <= this.radius) {
                        // 计算角度 (用于颜色映射)
                        const angle = Math.atan2(blockY - centerY, blockX - centerX);
                        const normalizedAngle = (angle + Math.PI) / (Math.PI * 2); // 0-1范围
                        
                        // 生成颜色
                        const color = this.generateColor(distance, normalizedAngle);
                        
                        // 添加方块
                        this.blocks.push({
                            x: blockX,
                            y: blockY,
                            size: this.blockSize,
                            color,
                            distance: distance / this.radius, // 归一化距离 (0-1)
                            angle: normalizedAngle
                        });
                        
                        count++;
                    }
                }
                
                // 每生成25%的方块就输出一次进度
                if (y % Math.floor(gridSize / 4) === 0) {
                    console.log(`生成进度: ${Math.floor((y + gridSize / 2) / gridSize * 100)}%`);
                }
            }
            
            console.log(`生成了${this.blocks.length}个方块`);
            
            return this.blocks;
        } catch (error) {
            console.error('生成圆形网格失败:', error);
            // 返回至少一个方块，确保能显示一些东西
            this.blocks = [{
                x: 0, y: 0, size: 100, 
                color: [1, 0, 0, 1], // 红色
                distance: 0, angle: 0
            }];
            return this.blocks;
        }
    }
    
    /**
     * 生成颜色
     * @param {number} distance - 到中心的距离
     * @param {number} angle - 归一化的角度 (0-1)
     * @returns {Array<number>} RGBA颜色数组 [r, g, b, a]
     */
    generateColor(distance, angle) {
        switch (this.colorMode) {
            case 'rainbow':
                // 彩虹色 (基于角度)
                return MathUtils.hslToRgb(angle * 360, 100, 50);
                
            case 'distance':
                // 基于距离的颜色渐变
                const normalizedDistance = Math.min(1, distance / this.radius);
                // 从中心白色渐变到边缘蓝色
                return [
                    1 - normalizedDistance, // r
                    1 - normalizedDistance, // g
                    1, // b
                    1  // a
                ];
                
            case 'angle':
                // 离散角度颜色 (把圆分成多个扇区)
                const sectors = 8;
                const sectorIndex = Math.floor(angle * sectors);
                const hue = (sectorIndex / sectors) * 360;
                return MathUtils.hslToRgb(hue, 100, 50);
                
            default:
                // 默认灰度
                return [0.5, 0.5, 0.5, 1.0];
        }
    }
    
    /**
     * 切换颜色模式
     */
    toggleColorMode() {
        const modes = ['rainbow', 'distance', 'angle'];
        const currentIndex = modes.indexOf(this.colorMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.colorMode = modes[nextIndex];
        
        // 重新生成颜色
        for (const block of this.blocks) {
            block.color = this.generateColor(
                block.distance * this.radius,
                block.angle
            );
        }
        
        return this.colorMode;
    }
    
    /**
     * 调整方块大小
     * @param {number} newSize - 新的方块大小
     */
    setBlockSize(newSize) {
        this.blockSize = Math.max(0.1, newSize);
        this.generate(); // 重新生成网格
    }
} 
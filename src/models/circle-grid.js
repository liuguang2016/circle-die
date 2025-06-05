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
      console.log("CircleGrid初始化开始", radius);
      this.radius = radius;
      this.blocks = []; // 所有方块

      // 调整初始方块大小，使总数不超过70万个
      const maxBlocks = 900000;
      // 计算得到的方块大小
      const estimatedBlockCount = Math.PI * radius * radius;
      this.blockSize = Math.max(
        1.0,
        Math.sqrt(estimatedBlockCount / maxBlocks)
      );
      console.log(
        `估计方块数量: ${estimatedBlockCount}, 设置方块大小: ${this.blockSize}`
      );

      // 坏数据的概率 (0.5%)
      this.badDataRate = 0.005;

      console.log("CircleGrid初始化完成");
    } catch (error) {
      console.error("CircleGrid初始化失败:", error);
      // 设置默认值以确保程序能继续运行
      this.radius = radius || 500;
      this.blockSize = 5.0;
      this.blocks = [];
      this.badDataRate = 0.005;
    }
  }

  /**
   * 生成圆形网格
   */
  generate() {
    try {
      console.log("开始生成圆形网格, 方块大小:", this.blockSize);
      // 计算每行每列的方块数量
      const diameter = this.radius * 2;
      const gridSize = Math.ceil(diameter / this.blockSize);

      console.log(`网格尺寸: ${gridSize}x${gridSize}`);

      this.blocks = [];

      // 中心坐标
      const centerX = 0;
      const centerY = 0;

      // 记录坏数据的数量
      let badDataCount = 0;

      // 生成所有方块
      let count = 0;
      for (let y = -gridSize / 2; y < gridSize / 2; y++) {
        for (let x = -gridSize / 2; x < gridSize / 2; x++) {
          // 计算方块中心坐标
          const blockX = x * this.blockSize + this.blockSize / 2;
          const blockY = y * this.blockSize + this.blockSize / 2;

          // 计算到圆心的距离
          const distance = Math.sqrt(
            Math.pow(blockX - centerX, 2) + Math.pow(blockY - centerY, 2)
          );

          // 如果在圆内，添加方块
          if (distance <= this.radius) {
            // 计算角度 (用于位置信息保存)
            const angle = Math.atan2(blockY - centerY, blockX - centerX);
            const normalizedAngle = (angle + Math.PI) / (Math.PI * 2); // 0-1范围

            // 判断是否为坏数据
            const isBadData = Math.random() < this.badDataRate;

            // 根据数据类型设置颜色
            const color = isBadData ? [1, 0, 0, 1] : [1, 1, 1, 1]; // 坏数据为红色，正常数据为白色

            if (isBadData) {
              badDataCount++;
            }

            // 添加方块
            this.blocks.push({
              x: blockX,
              y: blockY,
              size: this.blockSize,
              color: color,
              distance: distance / this.radius, // 归一化距离 (0-1)
              angle: normalizedAngle,
              isBadData: isBadData,
            });

            count++;
          }
        }

        // 每生成25%的方块就输出一次进度
        if (y % Math.floor(gridSize / 4) === 0) {
          console.log(
            `生成进度: ${Math.floor(((y + gridSize / 2) / gridSize) * 100)}%`
          );
        }
      }

      console.log(
        `生成了${this.blocks.length}个方块，其中坏数据${badDataCount}个（${(
          (badDataCount / this.blocks.length) *
          100
        ).toFixed(2)}%）`
      );

      return this.blocks;
    } catch (error) {
      console.error("生成圆形网格失败:", error);
      // 返回至少一个方块，确保能显示一些东西
      this.blocks = [
        {
          x: 0,
          y: 0,
          size: 100,
          color: [1, 1, 1, 1], // 白色
          distance: 0,
          angle: 0,
          isBadData: false,
        },
      ];
      return this.blocks;
    }
  }

  /**
   * 生成颜色 (根据数据类型返回颜色)
   * @param {boolean} isBadData - 是否为坏数据
   * @returns {Array<number>} RGBA颜色数组 [r, g, b, a]
   */
  generateColor(isBadData = false) {
    // 根据数据类型返回颜色
    return isBadData ? [1, 0, 0, 1] : [1, 1, 1, 1];
  }

  /**
   * 调整方块大小
   * @param {number} newSize - 新的方块大小
   */
  setBlockSize(newSize) {
    this.blockSize = Math.max(0.1, newSize);
    this.generate(); // 重新生成网格
  }

  /**
   * 设置坏数据率
   * @param {number} rate - 坏数据率 (0-1)
   */
  setBadDataRate(rate) {
    this.badDataRate = Math.max(0, Math.min(1, rate));
    this.generate(); // 重新生成网格
  }
} 
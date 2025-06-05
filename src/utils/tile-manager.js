import { QuadTree } from '../core/quadtree.js';

/**
 * 瓦片管理器
 */
export class TileManager {
    /**
     * 构造函数
     * @param {CircleGrid} circleGrid - 圆形网格对象
     * @param {Camera} camera - 相机对象
     */
    constructor(circleGrid, camera) {
        try {
            console.log('TileManager初始化开始');
            this.circleGrid = circleGrid;
            this.camera = camera;
            this.quadTree = null;
            this.lodLevels = 6; // 增加LOD级别为6 (原来是5)
            this.baseTileSize = 1.0; // 基础瓦片大小
            this.lastZoomLevel = 0;
            this.needsRebuild = true;
            
            // 创建瓦片池
            this.tilePool = [];
            
            // 当前可见瓦片
            this.visibleTiles = [];
            
            // 初始化
            this.initialize();
            console.log('TileManager初始化完成');
        } catch (error) {
            console.error('TileManager初始化失败:', error);
        }
    }
    
    /**
     * 初始化
     */
    initialize() {
        console.log('开始生成圆形网格中的方块');
        // 生成圆形网格中的所有方块
        const blocks = this.circleGrid.generate();
        console.log(`生成完成，共${blocks.length}个方块`);
        
        // 为了提高性能，限制初始瓦片数量
        const maxInitialTiles = 300000; // 最大初始瓦片数量
        let processedBlocks = blocks;
        
        if (blocks.length > maxInitialTiles) {
            console.warn(`方块数量(${blocks.length})超过最大限制(${maxInitialTiles})，将进行采样`);
            // 对方块进行均匀采样
            const samplingRate = maxInitialTiles / blocks.length;
            processedBlocks = blocks.filter(() => Math.random() < samplingRate);
            console.log(`采样后的方块数量: ${processedBlocks.length}`);
        }
        
        console.log('创建四叉树');
        // 创建四叉树
        const size = this.circleGrid.radius * 2.5; // 稍大一些以包含所有方块
        this.quadTree = new QuadTree(size, size);
        
        console.log('将方块添加到四叉树');
        // 将所有方块添加到四叉树
        this.quadTree.insertAll(processedBlocks);
        
        console.log('构建LOD瓦片');
        // 创建初始LOD瓦片
        this.buildLODTiles();
    }
    
    /**
     * 构建LOD瓦片
     */
    buildLODTiles() {
        try {
            this.lodTiles = [];
            this.tilesByLevel = new Array(this.lodLevels).fill(0).map(() => []);
            
            console.log('复制原始方块作为最高细节级别');
            // 复制所有原始方块作为最高细节级别
            this.tilesByLevel[this.lodLevels - 1] = [...this.circleGrid.blocks];
            
            // 为每个LOD级别生成合并瓦片
            for (let level = this.lodLevels - 2; level >= 0; level--) {
                console.log(`构建LOD级别${level}的瓦片`);
                // 当前级别的瓦片尺寸是下一级别的2倍
                const tileSize = this.baseTileSize * Math.pow(2, this.lodLevels - 1 - level);
                
                // 计算网格尺寸
                const gridSize = Math.ceil(this.circleGrid.radius * 2 / tileSize);
                
                // 构建网格
                const grid = {};
                
                // 获取下一级别的瓦片
                const nextLevelTiles = this.tilesByLevel[level + 1];
                
                // 将下一级别的瓦片分组到网格中
                for (const tile of nextLevelTiles) {
                    // 计算所属网格单元
                    const gridX = Math.floor(tile.x / tileSize);
                    const gridY = Math.floor(tile.y / tileSize);
                    const key = `${gridX},${gridY}`;
                    
                    if (!grid[key]) {
                        grid[key] = {
                            tiles: [],
                            totalColor: [0, 0, 0, 0],
                            x: (gridX + 0.5) * tileSize,
                            y: (gridY + 0.5) * tileSize
                        };
                    }
                    
                    // 添加瓦片到网格单元
                    grid[key].tiles.push(tile);
                    
                    // 累加颜色
                    for (let i = 0; i < 4; i++) {
                        grid[key].totalColor[i] += tile.color[i];
                    }
                }
                
                // 为每个网格单元创建合并瓦片
                for (const key in grid) {
                    const cell = grid[key];
                    if (cell.tiles.length > 0) {
                        // 计算平均颜色
                        const avgColor = cell.totalColor.map(c => c / cell.tiles.length);
                        
                        // 创建合并瓦片
                        const mergedTile = {
                            x: cell.x,
                            y: cell.y,
                            size: tileSize,
                            color: avgColor,
                            merged: true,
                            originalTiles: cell.tiles,
                            level
                        };
                        
                        // 添加到当前LOD级别
                        this.tilesByLevel[level].push(mergedTile);
                    }
                }
                
                console.log(`LOD级别${level}: 生成了${this.tilesByLevel[level].length}个合并瓦片`);
            }
            
            this.needsRebuild = false;
        } catch (error) {
            console.error('构建LOD瓦片失败:', error);
            // 确保即使有错误也能渲染一些东西
            this.needsRebuild = false;
            // 使用最简单的瓦片集
            if (!this.tilesByLevel || !this.tilesByLevel[0] || this.tilesByLevel[0].length === 0) {
                this.tilesByLevel = [
                    [{x: 0, y: 0, size: 100, color: [1, 0, 0, 1]}] // 至少显示一个红色方块
                ];
            }
        }
    }
    
    /**
     * 获取可见瓦片
     * @returns {Array} 可见瓦片数组
     */
    getVisibleTiles() {
        const viewBounds = this.camera.getViewBounds();
        const currentZoom = this.camera.getZoomLevel();
        
        // 检查是否需要重建LOD瓦片
        if (this.needsRebuild) {
            this.buildLODTiles();
        }
        
        // 查询范围内的瓦片
        const range = {
            x: (viewBounds.left + viewBounds.right) / 2,
            y: (viewBounds.top + viewBounds.bottom) / 2,
            width: viewBounds.right - viewBounds.left,
            height: viewBounds.top - viewBounds.bottom
        };
        
        // 确定基于缩放的LOD级别
        const zoomBasedLevel = this.calculateLODLevelFromZoom(currentZoom);
        
        // 获取瓦片
        this.visibleTiles = this.quadTree.queryRange(range);
        
        // 应用LOD
        const result = this.applyLOD(this.visibleTiles, zoomBasedLevel);
        
        // 更新UI显示
        document.getElementById('visibleTiles').textContent = result.length;
        
        return result;
    }
    
    /**
     * 根据缩放级别计算LOD级别
     * @param {number} zoomLevel - 当前缩放级别
     * @returns {number} LOD级别
     */
    calculateLODLevelFromZoom(zoomLevel) {
        // 映射缩放级别到LOD级别
        // 缩放越大，LOD级别越高 (更多细节)
        const minZoom = this.camera.minZoom;
        const maxZoom = this.camera.maxZoom;
        
        // 更平滑的LOD计算方式
        let normalizedZoom = (zoomLevel - minZoom) / (maxZoom - minZoom);
        
        // 应用非线性映射，使缩放较高时增加更多细节
        normalizedZoom = Math.pow(normalizedZoom, 0.8);
        
        // 计算LOD级别，支持小数级别
        const floatLevel = normalizedZoom * (this.lodLevels - 1);
        
        // 返回整数级别（0 到 lodLevels-1）
        return Math.min(this.lodLevels - 1, Math.floor(floatLevel));
    }
    
    /**
     * 应用LOD策略
     * @param {Array} tiles - 瓦片数组
     * @param {number} baseLevel - 基础LOD级别
     * @returns {Array} 经过LOD处理的瓦片数组
     */
    applyLOD(tiles, baseLevel) {
        // 创建网格来跟踪已处理的区域
        const processedGrid = {};
        const result = [];
        
        // 计算每个瓦片的距离到视口中心
        const viewBounds = this.camera.getViewBounds();
        const centerX = (viewBounds.left + viewBounds.right) / 2;
        const centerY = (viewBounds.top + viewBounds.bottom) / 2;
        
        // 视口宽度，用于计算距离因子
        const viewportWidth = viewBounds.right - viewBounds.left;
        const viewportHeight = viewBounds.bottom - viewBounds.top;
        const viewportSize = Math.max(viewportWidth, viewportHeight);
        
        // 对每个瓦片应用基于距离的LOD
        for (const tile of tiles) {
          // 计算到视口中心的距离
          const distanceToCenter = Math.sqrt(
            Math.pow(tile.x - centerX, 2) + Math.pow(tile.y - centerY, 2)
          );

          // 计算基于距离的LOD调整
          // 距离越远，细节越少，但减少LOD下降速度
          const distanceFactor = Math.min(
            1,
            distanceToCenter / (viewportSize * 0.8)
          );

          // 指数下降，使中心区域保持高细节，边缘区域逐渐降低细节
          const lodDropoff = 2.5 * Math.pow(distanceFactor, 1.5);

          // 计算最终LOD级别，至少保持0级
          const targetLevel = Math.max(0, baseLevel - Math.floor(lodDropoff));

          // 计算瓦片在此LOD级别的网格位置
          const tileSize =
            this.baseTileSize * Math.pow(2, this.lodLevels - 1 - targetLevel);
          const gridX = Math.floor(tile.x / tileSize);
          const gridY = Math.floor(tile.y / tileSize);
          const gridKey = `${targetLevel}:${gridX},${gridY}`;

          // 检查此位置是否已处理
          if (!processedGrid[gridKey]) {
            processedGrid[gridKey] = true;

            // 查找对应的LOD瓦片
            const lodTiles = this.tilesByLevel[targetLevel];
            const lodTile = lodTiles.find(
              (t) =>
                Math.floor(t.x / tileSize) === gridX &&
                Math.floor(t.y / tileSize) === gridY
            );

            if (lodTile) {
              result.push(lodTile);
            } else if (targetLevel < this.lodLevels - 1) {
              // 如果没有找到合适的LOD瓦片，尝试在更高细节级别寻找
              let foundHigherLOD = false;

              // 从当前级别+1开始搜索
              for (
                let level = targetLevel + 1;
                level < this.lodLevels;
                level++
              ) {
                // 计算在此级别的网格位置
                const higherTileSize =
                  this.baseTileSize * Math.pow(2, this.lodLevels - 1 - level);
                const higherGridXMin = Math.floor(
                  (gridX * tileSize) / higherTileSize
                );
                const higherGridXMax = Math.floor(
                  ((gridX + 1) * tileSize) / higherTileSize
                );
                const higherGridYMin = Math.floor(
                  (gridY * tileSize) / higherTileSize
                );
                const higherGridYMax = Math.floor(
                  ((gridY + 1) * tileSize) / higherTileSize
                );

                // 检查每个可能的位置
                for (let x = higherGridXMin; x <= higherGridXMax; x++) {
                  for (let y = higherGridYMin; y <= higherGridYMax; y++) {
                    const higherLodTiles = this.tilesByLevel[level];
                    const higherLodTile = higherLodTiles.find(
                      (t) =>
                        Math.floor(t.x / higherTileSize) === x &&
                        Math.floor(t.y / higherTileSize) === y
                    );

                    if (higherLodTile) {
                      result.push(higherLodTile);
                      foundHigherLOD = true;
                    }
                  }
                }

                // 如果找到了更高细节级别的瓦片，不再继续搜索
                if (foundHigherLOD) break;
              }

              // 如果在所有级别都没找到，使用原始瓦片
              if (!foundHigherLOD) {
                result.push(tile);
              }
            } else {
              // 直接使用原始瓦片
              result.push(tile);
            }
          }
        }
        
        return result;
    }
    
    /**
     * 重建瓦片
     */
    rebuildTiles() {
        this.needsRebuild = true;
    }
} 
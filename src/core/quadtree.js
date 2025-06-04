/**
 * 四叉树节点
 */
class QuadTreeNode {
    /**
     * 构造函数
     * @param {number} x - 区域中心X坐标
     * @param {number} y - 区域中心Y坐标
     * @param {number} width - 区域宽度
     * @param {number} height - 区域高度
     * @param {number} depth - 当前深度
     * @param {number} maxDepth - 最大深度
     * @param {number} maxItems - 每个节点最大容纳元素数
     */
    constructor(x, y, width, height, depth = 0, maxDepth = 8, maxItems = 10) {
        this.bounds = { x, y, width, height };
        this.depth = depth;
        this.maxDepth = maxDepth;
        this.maxItems = maxItems;
        this.items = [];
        this.children = null;
    }

    /**
     * 检查点是否在节点范围内
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {boolean} 是否在范围内
     */
    contains(x, y) {
        return (
            x >= this.bounds.x - this.bounds.width / 2 &&
            x < this.bounds.x + this.bounds.width / 2 &&
            y >= this.bounds.y - this.bounds.height / 2 &&
            y < this.bounds.y + this.bounds.height / 2
        );
    }

    /**
     * 检查矩形是否与节点范围相交
     * @param {Object} rect - 矩形 {x, y, width, height}
     * @returns {boolean} 是否相交
     */
    intersects(rect) {
        const halfWidth = this.bounds.width / 2;
        const halfHeight = this.bounds.height / 2;
        const left = this.bounds.x - halfWidth;
        const right = this.bounds.x + halfWidth;
        const top = this.bounds.y + halfHeight;
        const bottom = this.bounds.y - halfHeight;

        const rectLeft = rect.x - rect.width / 2;
        const rectRight = rect.x + rect.width / 2;
        const rectTop = rect.y + rect.height / 2;
        const rectBottom = rect.y - rect.height / 2;

        return !(
            rectLeft > right ||
            rectRight < left ||
            rectTop < bottom ||
            rectBottom > top
        );
    }

    /**
     * 细分节点为四个子节点
     */
    subdivide() {
        if (this.children) return;

        const x = this.bounds.x;
        const y = this.bounds.y;
        const halfWidth = this.bounds.width / 2;
        const halfHeight = this.bounds.height / 2;
        const nextDepth = this.depth + 1;

        this.children = [
            // 左上
            new QuadTreeNode(
                x - halfWidth / 2,
                y + halfHeight / 2,
                halfWidth,
                halfHeight,
                nextDepth,
                this.maxDepth,
                this.maxItems
            ),
            // 右上
            new QuadTreeNode(
                x + halfWidth / 2,
                y + halfHeight / 2,
                halfWidth,
                halfHeight,
                nextDepth,
                this.maxDepth,
                this.maxItems
            ),
            // 左下
            new QuadTreeNode(
                x - halfWidth / 2,
                y - halfHeight / 2,
                halfWidth,
                halfHeight,
                nextDepth,
                this.maxDepth,
                this.maxItems
            ),
            // 右下
            new QuadTreeNode(
                x + halfWidth / 2,
                y - halfHeight / 2,
                halfWidth,
                halfHeight,
                nextDepth,
                this.maxDepth,
                this.maxItems
            )
        ];

        // 重新分配已有元素到子节点
        for (const item of this.items) {
            this.insertItemIntoChildren(item);
        }
        this.items = [];
    }

    /**
     * 将元素插入到子节点
     * @param {Object} item - 要插入的元素
     * @returns {boolean} 是否成功插入
     */
    insertItemIntoChildren(item) {
        if (!this.children) return false;

        for (const child of this.children) {
            if (child.contains(item.x, item.y)) {
                child.insert(item);
                return true;
            }
        }
        return false;
    }

    /**
     * 插入元素
     * @param {Object} item - 要插入的元素
     */
    insert(item) {
        // 如果有子节点，尝试插入到子节点
        if (this.children) {
            if (this.insertItemIntoChildren(item)) return;
        }

        // 如果无法插入子节点或没有子节点，添加到当前节点
        this.items.push(item);

        // 检查是否需要细分
        if (!this.children && this.items.length > this.maxItems && this.depth < this.maxDepth) {
            this.subdivide();
        }
    }

    /**
     * 查询包含点的元素
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {Array} 包含点的元素数组
     */
    queryPoint(x, y) {
        const result = [];

        // 如果点不在此节点范围内，返回空结果
        if (!this.contains(x, y)) {
            return result;
        }

        // 检查当前节点的元素
        for (const item of this.items) {
            if (this.itemContainsPoint(item, x, y)) {
                result.push(item);
            }
        }

        // 如果有子节点，继续查询
        if (this.children) {
            for (const child of this.children) {
                if (child.contains(x, y)) {
                    result.push(...child.queryPoint(x, y));
                }
            }
        }

        return result;
    }

    /**
     * 查询区域内的元素
     * @param {Object} range - 查询区域 {x, y, width, height}
     * @returns {Array} 区域内的元素数组
     */
    queryRange(range) {
        const result = [];

        // 如果查询区域与此节点不相交，返回空结果
        if (!this.intersects(range)) {
            return result;
        }

        // 检查当前节点的元素
        for (const item of this.items) {
            if (this.itemIntersectsRange(item, range)) {
                result.push(item);
            }
        }

        // 如果有子节点，继续查询
        if (this.children) {
            for (const child of this.children) {
                result.push(...child.queryRange(range));
            }
        }

        return result;
    }

    /**
     * 检查元素是否包含点
     * @param {Object} item - 元素
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {boolean} 是否包含点
     */
    itemContainsPoint(item, x, y) {
        // 瓦片包含点的逻辑，取决于瓦片的形状
        // 假设瓦片是矩形
        const halfSize = item.size / 2;
        return (
            x >= item.x - halfSize &&
            x < item.x + halfSize &&
            y >= item.y - halfSize &&
            y < item.y + halfSize
        );
    }

    /**
     * 检查元素是否与区域相交
     * @param {Object} item - 元素
     * @param {Object} range - 区域 {x, y, width, height}
     * @returns {boolean} 是否相交
     */
    itemIntersectsRange(item, range) {
        // 瓦片与区域相交的逻辑
        const halfSize = item.size / 2;
        const itemLeft = item.x - halfSize;
        const itemRight = item.x + halfSize;
        const itemTop = item.y + halfSize;
        const itemBottom = item.y - halfSize;

        const rangeLeft = range.x - range.width / 2;
        const rangeRight = range.x + range.width / 2;
        const rangeTop = range.y + range.height / 2;
        const rangeBottom = range.y - range.height / 2;

        return !(
            itemLeft > rangeRight ||
            itemRight < rangeLeft ||
            itemTop < rangeBottom ||
            itemBottom > rangeTop
        );
    }
}

/**
 * 四叉树
 */
export class QuadTree {
    /**
     * 构造函数
     * @param {number} width - 区域宽度
     * @param {number} height - 区域高度
     * @param {number} maxDepth - 最大深度
     * @param {number} maxItems - 每个节点最大容纳元素数
     */
    constructor(width, height, maxDepth = 8, maxItems = 10) {
        this.root = new QuadTreeNode(0, 0, width, height, 0, maxDepth, maxItems);
    }

    /**
     * 插入元素
     * @param {Object} item - 要插入的元素
     */
    insert(item) {
        this.root.insert(item);
    }

    /**
     * 插入多个元素
     * @param {Array} items - 要插入的元素数组
     */
    insertAll(items) {
        for (const item of items) {
            this.insert(item);
        }
    }

    /**
     * 查询包含点的元素
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {Array} 包含点的元素数组
     */
    queryPoint(x, y) {
        return this.root.queryPoint(x, y);
    }

    /**
     * 查询区域内的元素
     * @param {Object} range - 查询区域 {x, y, width, height}
     * @returns {Array} 区域内的元素数组
     */
    queryRange(range) {
        return this.root.queryRange(range);
    }
} 
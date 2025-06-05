/**
 * 数学工具类
 */
export class MathUtils {
    /**
     * 创建正交投影矩阵
     * @param {number} left - 左边界
     * @param {number} right - 右边界
     * @param {number} bottom - 下边界
     * @param {number} top - 上边界
     * @param {number} near - 近平面
     * @param {number} far - 远平面
     * @returns {Float32Array} 正交投影矩阵
     */
    static ortho(left, right, bottom, top, near, far) {
        try {
            // 检查输入参数有效性
            if ([left, right, bottom, top, near, far].some(v => !isFinite(v))) {
                console.warn("正交投影矩阵计算收到无效参数");
                return this.identity(); // 返回单位矩阵作为备选
            }
            
            // 检查除数不为零
            if (Math.abs(left - right) < 0.0001 || Math.abs(bottom - top) < 0.0001 || Math.abs(near - far) < 0.0001) {
                console.warn("正交投影矩阵参数范围过小");
                return this.identity();
            }
            
            const lr = 1 / (left - right);
            const bt = 1 / (bottom - top);
            const nf = 1 / (near - far);
            
            return new Float32Array([
                -2 * lr, 0, 0, 0,
                0, -2 * bt, 0, 0,
                0, 0, 2 * nf, 0,
                (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
            ]);
        } catch (error) {
            console.error("正交投影矩阵计算失败:", error);
            return this.identity();
        }
    }

    /**
     * 创建平移矩阵
     * @param {number} tx - X轴平移量
     * @param {number} ty - Y轴平移量
     * @param {number} tz - Z轴平移量
     * @returns {Float32Array} 平移矩阵
     */
    static translation(tx, ty, tz = 0) {
        try {
            // 检查输入参数有效性
            if ([tx, ty, tz].some(v => !isFinite(v))) {
                console.warn("平移矩阵计算收到无效参数");
                return this.identity();
            }
            
            // 限制极端值
            const boundTx = Math.max(-1e6, Math.min(1e6, tx));
            const boundTy = Math.max(-1e6, Math.min(1e6, ty));
            const boundTz = Math.max(-1e6, Math.min(1e6, tz));
            
            return new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                boundTx, boundTy, boundTz, 1
            ]);
        } catch (error) {
            console.error("平移矩阵计算失败:", error);
            return this.identity();
        }
    }

    /**
     * 创建缩放矩阵
     * @param {number} sx - X轴缩放量
     * @param {number} sy - Y轴缩放量
     * @param {number} sz - Z轴缩放量
     * @returns {Float32Array} 缩放矩阵
     */
    static scaling(sx, sy, sz = 1) {
        try {
            // 检查输入参数有效性
            if ([sx, sy, sz].some(v => !isFinite(v) || Math.abs(v) < 0.0001)) {
                console.warn("缩放矩阵计算收到无效参数");
                return this.identity();
            }
            
            return new Float32Array([
                sx, 0, 0, 0,
                0, sy, 0, 0,
                0, 0, sz, 0,
                0, 0, 0, 1
            ]);
        } catch (error) {
            console.error("缩放矩阵计算失败:", error);
            return this.identity();
        }
    }

    /**
     * 矩阵乘法
     * @param {Float32Array} a - 矩阵A
     * @param {Float32Array} b - 矩阵B
     * @returns {Float32Array} 结果矩阵
     */
    static multiplyMatrix(a, b) {
        try {
            // 检查输入矩阵有效性
            if (!a || !b || a.length !== 16 || b.length !== 16) {
                console.warn("矩阵乘法收到无效参数");
                return this.identity();
            }
            
            // 检查矩阵中是否包含无效值
            if ([...a, ...b].some(v => !isFinite(v))) {
                console.warn("矩阵包含非数值元素");
                return this.identity();
            }
            
            const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

            const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
            const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
            const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
            const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

            const result = new Float32Array([
                a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
                a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
                a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
                a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
                a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
                a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
                a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
                a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
                a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
                a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
                a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
                a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
                a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
                a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
                a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
                a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33
            ]);
            
            // 检查计算结果是否有效
            if (result.some(v => !isFinite(v))) {
                console.warn("矩阵乘法结果包含无效值");
                return this.identity();
            }
            
            return result;
        } catch (error) {
            console.error("矩阵乘法计算失败:", error);
            return this.identity();
        }
    }
    
    /**
     * 创建单位矩阵
     * @returns {Float32Array} 单位矩阵
     */
    static identity() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * 转换极坐标到笛卡尔坐标
     * @param {number} radius - 半径
     * @param {number} angle - 角度(弧度)
     * @returns {Array<number>} [x, y]坐标
     */
    static polarToCartesian(radius, angle) {
        try {
            // 检查输入参数有效性
            if (!isFinite(radius) || !isFinite(angle)) {
                return [0, 0];
            }
            
            return [
                radius * Math.cos(angle),
                radius * Math.sin(angle)
            ];
        } catch (error) {
            console.error("极坐标转换失败:", error);
            return [0, 0];
        }
    }

    /**
     * 生成HSL颜色
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 饱和度 (0-100)
     * @param {number} l - 亮度 (0-100)
     * @returns {Array<number>} RGBA颜色数组 [r, g, b, a] (0-1)
     */
    static hslToRgb(h, s, l) {
        try {
          // 检查输入参数有效性
          if (!isFinite(h) || !isFinite(s) || !isFinite(l)) {
            return [0, 0, 0, 1]; // 默认黑色
          }

          h = ((h % 360) + 360) % 360; // 确保色相在0-360范围内
          s = Math.max(0, Math.min(100, s));
          l = Math.max(0, Math.min(100, l));

          h /= 360;
          s /= 100;
          l /= 100;

          let r, g, b;

          if (s === 0) {
            r = g = b = l;
          } else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }

          return [r, g, b, 1.0];
        } catch (error) {
          console.error("HSL转RGB失败:", error);
          return [0, 0, 0, 1]; // 默认黑色
        }
    }
} 
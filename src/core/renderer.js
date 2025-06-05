/**
 * WebGL渲染器类
 */
export class Renderer {
  /**
   * 构造函数
   * @param {HTMLCanvasElement} canvas - Canvas元素
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.ctx2d = null; // 用于降级渲染的2D上下文
    this.program = null;
    this.attributes = {};
    this.uniforms = {};
    this.buffers = {};
    this.isInitialized = false;
    this.useWebGL = true; // 是否使用WebGL渲染
    this.maxInstanceCount = 20000; // 每批次最大实例数
    this.fps = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.frameTimeAccumulator = 0;
    this.useOffscreenCanvas = false;
    this.displayCanvas = null;
    this.hasContextLost = false; // 标记WebGL上下文是否丢失

    // 初始化渲染器
    this.initialize();

    // 设置窗口大小调整事件
    window.addEventListener("resize", () => this.resizeCanvas());

    // 设置WebGL上下文事件监听器
    this.setupContextEventListeners();
  }

  /**
   * 设置WebGL上下文事件监听器
   */
  setupContextEventListeners() {
    if (!this.canvas) return;

    // 监听WebGL上下文丢失事件
    this.canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault(); // 阻止默认行为，允许恢复
        console.warn("WebGL上下文丢失");
        this.hasContextLost = true;
      },
      false
    );

    // 监听WebGL上下文恢复事件
    this.canvas.addEventListener(
      "webglcontextrestored",
      () => {
        console.log("WebGL上下文已恢复，重新初始化渲染器");
        this.hasContextLost = false;
        this.reinitialize();
      },
      false
    );
  }

  /**
   * 重新初始化渲染器
   */
  reinitialize() {
    try {
      // 清除旧的WebGL资源
      this.disposeResources();

      // 重新初始化
      this.gl = this.tryGetWebGLContext();

      if (this.gl) {
        console.log("WebGL上下文重新获取成功");

        // 为WebGL1添加必要的扩展
        if (this.gl instanceof WebGLRenderingContext) {
          this.setupWebGL1Extensions();
        }

        // 重新编译着色器
        this.program = this.createShaderProgram();

        // 重新初始化WebGL资源
        this.setupWebGLResources();

        // 设置初始状态
        this.gl.clearColor(0.05, 0.05, 0.1, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.isInitialized = true;
        this.useWebGL = true;
      } else {
        // 如果无法重新获取WebGL上下文，降级到Canvas 2D
        this.fallbackToCanvas2D("WebGL上下文恢复失败");
      }
    } catch (error) {
      console.error("重新初始化渲染器失败:", error);
      this.fallbackToCanvas2D(error.message);
    }
  }

  /**
   * 释放WebGL资源
   */
  disposeResources() {
    if (!this.gl) return;

    try {
      // 删除着色器程序
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }

      // 删除缓冲区
      for (const key in this.buffers) {
        if (this.buffers[key]) {
          this.gl.deleteBuffer(this.buffers[key]);
        }
      }
      this.buffers = {};

      // 重置属性和uniform位置
      this.attributes = {};
      this.uniforms = {};
    } catch (error) {
      console.error("释放WebGL资源失败:", error);
    }
  }

  /**
   * 初始化渲染器
   */
  initialize() {
    try {
      // 首先尝试初始化WebGL
      this.initWebGL();

      // 调整Canvas大小
      this.resizeCanvas();

      console.log(
        "渲染器初始化成功，使用模式:",
        this.useWebGL ? "WebGL" : "Canvas 2D"
      );
      this.isInitialized = true;
    } catch (error) {
      console.error("渲染器初始化失败:", error);
      // 尝试使用Canvas 2D作为备选
      this.fallbackToCanvas2D(error.message);
    }
  }

  /**
   * 确保Canvas尺寸有效
   * @param {HTMLCanvasElement} canvas - 要检查的Canvas元素
   * @param {number} defaultWidth - 默认宽度
   * @param {number} defaultHeight - 默认高度
   * @returns {boolean} - 返回是否修改了尺寸
   */
  ensureCanvasSize(canvas, defaultWidth = 800, defaultHeight = 600) {
    if (!canvas) return false;

    let modified = false;

    if (!canvas.width || canvas.width <= 0) {
      canvas.width = canvas.clientWidth || defaultWidth;
      modified = true;
    }

    if (!canvas.height || canvas.height <= 0) {
      canvas.height = canvas.clientHeight || defaultHeight;
      modified = true;
    }

    if (modified) {
      console.log(`Canvas尺寸调整为: ${canvas.width} x ${canvas.height}`);
    }

    return modified;
  }

  /**
   * 初始化WebGL
   */
  initWebGL() {
    try {
      // 确保canvas元素正常
      if (!this.canvas) {
        throw new Error("Canvas元素不存在");
      }

      // 确保canvas尺寸有效
      this.ensureCanvasSize(this.canvas);

      console.log("Canvas尺寸:", this.canvas.width, "x", this.canvas.height);
      console.log(
        "Canvas客户端尺寸:",
        this.canvas.clientWidth,
        "x",
        this.canvas.clientHeight
      );

      // 检查是否支持WebGL
      let debugInfo = null;
      try {
        const testCanvas = document.createElement("canvas");
        const testGL =
          testCanvas.getContext("webgl") ||
          testCanvas.getContext("experimental-webgl");
        if (testGL) {
          debugInfo = testGL.getExtension("WEBGL_debug_renderer_info");
          if (debugInfo) {
            console.log(
              "WebGL供应商:",
              testGL.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
            );
            console.log(
              "WebGL渲染器:",
              testGL.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            );
          }
        }
      } catch (e) {
        console.warn("WebGL检测失败:", e);
      }

      // 检测是否已经有上下文，如果有，清除相关状态
      const hasCtx2d = !!this.canvas.getContext("2d");
      if (hasCtx2d) {
        console.warn("Canvas已经有2D上下文，WebGL可能会获取失败");
      }

      // 优先尝试最简单的WebGL获取方式
      this.gl = this.tryGetWebGLContext();

      // 如果获取失败并且画布已有2D上下文，尝试创建离屏canvas
      if (!this.gl && hasCtx2d) {
        console.log("尝试使用离屏Canvas获取WebGL上下文");
        const offscreenCanvas = document.createElement("canvas");

        // 确保原始Canvas尺寸有效，以便正确复制到离屏Canvas
        this.ensureCanvasSize(this.canvas);

        // 设置离屏Canvas的尺寸与原始Canvas相同
        offscreenCanvas.width = this.canvas.width;
        offscreenCanvas.height = this.canvas.height;

        console.log(
          "创建离屏Canvas，尺寸:",
          offscreenCanvas.width,
          "x",
          offscreenCanvas.height
        );

        // 保存原始canvas用于显示
        this.displayCanvas = this.canvas;
        this.canvas = offscreenCanvas;

        // 在新canvas上尝试获取WebGL
        this.gl = this.tryGetWebGLContext();

        if (this.gl) {
          console.log("使用离屏Canvas成功获取WebGL上下文");
          // 添加渲染完成后复制到显示canvas的逻辑
          this.useOffscreenCanvas = true;
        }
      }

      // 如果WebGL完全不可用，降级到Canvas 2D
      if (!this.gl) {
        throw new Error("WebGL不可用，浏览器可能不支持WebGL或被禁用");
      }

      console.log(
        "WebGL上下文创建成功",
        this.gl instanceof WebGLRenderingContext ? "WebGL 1.0" : "WebGL 2.0"
      );

      // 为WebGL1添加必要的扩展
      if (this.gl instanceof WebGLRenderingContext) {
        this.setupWebGL1Extensions();
      }

      // 编译着色器
      this.program = this.createShaderProgram();
      console.log("着色器程序创建成功");

      // 初始化WebGL资源
      this.setupWebGLResources();

      // 设置初始状态
      this.gl.clearColor(0.05, 0.05, 0.1, 1.0);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      this.useWebGL = true;
    } catch (error) {
      console.error("WebGL初始化失败:", error);
      throw error; // 向上传递错误
    }
  }

  /**
   * 尝试获取WebGL上下文
   * @returns {WebGLRenderingContext|WebGL2RenderingContext|null} WebGL上下文
   */
  tryGetWebGLContext() {
    // 尝试不同的上下文获取方式
    let gl = null;

    // 确保canvas有有效尺寸
    this.ensureCanvasSize(this.canvas);

    // 获取设备像素比，用于高DPI屏幕
    const pixelRatio = window.devicePixelRatio || 1;

    // 调整canvas尺寸以匹配设备像素比
    if (pixelRatio > 1) {
      const displayWidth = this.canvas.clientWidth;
      const displayHeight = this.canvas.clientHeight;
      this.canvas.width = displayWidth * pixelRatio;
      this.canvas.height = displayHeight * pixelRatio;
      console.log(
        `应用设备像素比 ${pixelRatio}，Canvas尺寸调整为: ${this.canvas.width} x ${this.canvas.height}`
      );
    }

    // 先尝试获取WebGL2上下文
    console.log("尝试获取WebGL2上下文...");
    gl = this.canvas.getContext("webgl2", {
      antialias: true,
      alpha: false, // 禁用alpha以提高性能
      depth: true,
      stencil: false, // 不需要模板缓冲区
      failIfMajorPerformanceCaveat: false, // 即使性能较低也创建上下文
      powerPreference: "high-performance", // 使用高性能模式
      preserveDrawingBuffer: true, // 保留绘图缓冲区，提高截图质量
    });

    // 如果WebGL2不可用，尝试使用WebGL1
    if (!gl) {
      console.warn("WebGL2不可用，尝试使用WebGL1");
      // 尝试不同的上下文参数组合
      const contextOptions = [
        {
          antialias: true,
          alpha: false,
          depth: true,
          stencil: false,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        },
        {
          antialias: true,
          alpha: false,
          depth: true,
          stencil: false,
        },
        {
          // 最简单的选项
        },
      ];

      // 尝试不同的选项
      for (const options of contextOptions) {
        console.log("尝试WebGL选项:", JSON.stringify(options));
        gl =
          this.canvas.getContext("webgl", options) ||
          this.canvas.getContext("experimental-webgl", options);
        if (gl) {
          console.log(
            "WebGL1上下文创建成功，使用选项:",
            JSON.stringify(options)
          );
          break;
        }
      }
    }

    return gl;
  }

  /**
   * 降级到Canvas 2D渲染
   * @param {string} errorMessage - 错误信息
   */
  fallbackToCanvas2D(errorMessage) {
    try {
      console.warn(`降级到Canvas 2D渲染，原因: ${errorMessage}`);
      this.useWebGL = false;
      this.gl = null;

      // 获取2D上下文
      this.ctx2d = this.canvas.getContext("2d");

      if (!this.ctx2d) {
        throw new Error("无法创建Canvas 2D上下文");
      }

      // 设置基本样式
      this.ctx2d.fillStyle = "#1a1a1a";
      this.ctx2d.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // 显示降级消息
      this.ctx2d.fillStyle = "#ffffff";
      this.ctx2d.font = "14px Arial";
      this.ctx2d.textAlign = "center";
      this.ctx2d.fillText(
        "使用Canvas 2D降级渲染 (性能受限)",
        this.canvas.width / 2,
        20
      );

      this.isInitialized = true;
    } catch (error) {
      console.error("Canvas 2D降级失败:", error);
      this.showError("无法初始化任何渲染上下文，请检查浏览器设置");
      this.isInitialized = false;
    }
  }

  /**
   * 为WebGL1设置必要的扩展
   */
  setupWebGL1Extensions() {
    try {
      // 获取实例化绘制扩展
      const instanceExt = this.gl.getExtension("ANGLE_instanced_arrays");

      if (!instanceExt) {
        throw new Error("ANGLE_instanced_arrays扩展不可用");
      }

      // 添加WebGL2兼容函数
      this.gl.vertexAttribDivisor = (index, divisor) => {
        instanceExt.vertexAttribDivisorANGLE(index, divisor);
      };

      this.gl.drawElementsInstanced = (
        mode,
        count,
        type,
        offset,
        instanceCount
      ) => {
        instanceExt.drawElementsInstancedANGLE(
          mode,
          count,
          type,
          offset,
          instanceCount
        );
      };

      // 存储扩展以便后续使用
      this.instanceExt = instanceExt;

      console.log("WebGL1扩展设置成功");
    } catch (error) {
      console.error("WebGL1扩展设置失败:", error);
      throw error;
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误消息
   */
  showError(message) {
    // 在Canvas上显示错误信息
    if (this.canvas) {
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = "#ff5252";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          message,
          this.canvas.width / 2,
          this.canvas.height / 2 - 20
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "14px Arial";
        ctx.fillText(
          "请尝试使用支持WebGL的浏览器，如Chrome或Firefox",
          this.canvas.width / 2,
          this.canvas.height / 2 + 20
        );
        ctx.fillText(
          "或检查浏览器设置是否启用了硬件加速",
          this.canvas.width / 2,
          this.canvas.height / 2 + 40
        );
      }
    }
  }

  /**
   * 创建着色器程序
   * @returns {WebGLProgram} 着色器程序
   */
  createShaderProgram() {
    try {
      // 检查gl是否已初始化
      if (!this.gl) {
        throw new Error("WebGL上下文未初始化");
      }

      // 尝试加载外部着色器，如果失败则使用内置着色器
      try {
        return this.createShaderProgramFromSource(
          this.getVertexShaderSource(),
          this.getFragmentShaderSource()
        );
      } catch (error) {
        console.error("加载着色器源码失败:", error);
        return this.createBuiltinShaderProgram();
      }
    } catch (error) {
      console.error("创建着色器程序失败:", error);
      throw error;
    }
  }

  /**
   * 获取顶点着色器源码
   * @returns {string} 着色器源码
   */
  getVertexShaderSource() {
    // 使用内联的顶点着色器源码
    return `
      attribute vec2 a_position;
      attribute vec2 a_instancePosition;
      attribute vec4 a_instanceColor;
      attribute float a_instanceSize;
      
      uniform mat4 u_matrix;
      uniform float u_zoom;
      uniform float u_pixelRatio;
      
      varying vec4 v_color;
      varying vec2 v_position;
      
      void main() {
          // 计算实例化位置
          vec2 position = a_position * a_instanceSize + a_instancePosition;
          
          gl_Position = u_matrix * vec4(position, 0.0, 1.0);
          
          // 传递颜色到片元着色器
          v_color = a_instanceColor;
          
          // 传递原始位置给片元着色器，用于边缘平滑处理
          v_position = a_position;
      }
    `;
  }

  /**
   * 获取片元着色器源码
   * @returns {string} 着色器源码
   */
  getFragmentShaderSource() {
    // 使用内联的片元着色器源码
    return `
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
    `;
  }

  /**
   * 从指定源码创建着色器程序
   * @param {string} vertexShaderSource - 顶点着色器源码
   * @param {string} fragmentShaderSource - 片元着色器源码
   * @returns {WebGLProgram} 着色器程序
   */
  createShaderProgramFromSource(vertexShaderSource, fragmentShaderSource) {
    try {
      // 确保WebGL上下文存在
      if (!this.gl) {
        throw new Error("WebGL上下文未初始化");
      }

      // 创建顶点着色器
      const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
      this.gl.shaderSource(vertexShader, vertexShaderSource);
      this.gl.compileShader(vertexShader);

      // 检查顶点着色器编译状态
      if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
        const error = new Error(
          "顶点着色器编译失败: " + this.gl.getShaderInfoLog(vertexShader)
        );
        console.error(error);
        console.error("着色器源码:", vertexShaderSource);
        throw error;
      }

      // 创建片元着色器
      const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      this.gl.shaderSource(fragmentShader, fragmentShaderSource);
      this.gl.compileShader(fragmentShader);

      // 检查片元着色器编译状态
      if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
        const error = new Error(
          "片元着色器编译失败: " + this.gl.getShaderInfoLog(fragmentShader)
        );
        console.error(error);
        console.error("着色器源码:", fragmentShaderSource);
        throw error;
      }

      // 创建着色器程序
      const program = this.gl.createProgram();
      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      // 检查程序链接状态
      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        const error = new Error(
          "着色器程序链接失败: " + this.gl.getProgramInfoLog(program)
        );
        console.error(error);
        throw error;
      }

      return program;
    } catch (error) {
      console.error("从源码创建着色器程序失败:", error);
      throw error;
    }
  }

  /**
   * 创建内置着色器程序
   * @returns {WebGLProgram} 着色器程序
   */
  createBuiltinShaderProgram() {
    return this.createShaderProgramFromSource(
      this.getVertexShaderSource(),
      this.getFragmentShaderSource()
    );
  }

  /**
   * 设置WebGL资源
   */
  setupWebGLResources() {
    try {
      // 获取属性位置
      this.attributes = {
        position: this.gl.getAttribLocation(this.program, "a_position"),
        instancePosition: this.gl.getAttribLocation(
          this.program,
          "a_instancePosition"
        ),
        instanceColor: this.gl.getAttribLocation(
          this.program,
          "a_instanceColor"
        ),
        instanceSize: this.gl.getAttribLocation(this.program, "a_instanceSize"),
      };

      // 获取uniform位置
      this.uniforms = {
        matrix: this.gl.getUniformLocation(this.program, "u_matrix"),
        zoom: this.gl.getUniformLocation(this.program, "u_zoom"),
        pixelRatio: this.gl.getUniformLocation(this.program, "u_pixelRatio"),
      };

      // 创建顶点缓冲区
      this.buffers.position = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);

      // 创建一个单位正方形 (方块形状)
      const vertices = new Float32Array([
        -0.5,
        -0.5, // 左下
        0.5,
        -0.5, // 右下
        0.5,
        0.5, // 右上
        -0.5,
        0.5, // 左上
      ]);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

      // 创建索引缓冲区
      this.buffers.indices = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

      // 定义索引 (两个三角形组成一个正方形)
      const indices = new Uint16Array([
        0,
        1,
        2, // 第一个三角形
        0,
        2,
        3, // 第二个三角形
      ]);
      this.gl.bufferData(
        this.gl.ELEMENT_ARRAY_BUFFER,
        indices,
        this.gl.STATIC_DRAW
      );

      // 创建实例化位置缓冲区
      this.buffers.instancePosition = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instancePosition);
      // 暂不填充数据，将在渲染时填充

      // 创建实例化颜色缓冲区
      this.buffers.instanceColor = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceColor);
      // 暂不填充数据，将在渲染时填充

      // 创建实例化大小缓冲区
      this.buffers.instanceSize = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceSize);
      // 暂不填充数据，将在渲染时填充

      // 设置混合模式
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      console.log("WebGL资源设置完成");
    } catch (error) {
      console.error("设置WebGL资源失败:", error);
      throw error;
    }
  }

  /**
   * 调整Canvas大小
   */
  resizeCanvas() {
    try {
      if (!this.canvas) return;

      const devicePixelRatio = window.devicePixelRatio || 1;

      // 获取显示尺寸
      const displayWidth = this.canvas.clientWidth;
      const displayHeight = this.canvas.clientHeight;

      // 设置Canvas内部尺寸
      this.canvas.width = displayWidth * devicePixelRatio;
      this.canvas.height = displayHeight * devicePixelRatio;

      // 设置视口 (如果使用WebGL)
      if (this.gl) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      } else if (this.ctx2d) {
        // 对于Canvas 2D，设置适当的缩放
        this.ctx2d.scale(devicePixelRatio, devicePixelRatio);
      }
    } catch (error) {
      console.error("调整Canvas大小失败:", error);
    }
  }

  /**
   * 渲染场景
   * @param {Array} tiles - 要渲染的瓦片数组
   * @param {Camera} camera - 相机对象
   */
  render(tiles, camera) {
    if (!this.isInitialized) return;

    // 如果WebGL上下文丢失，尝试恢复或跳过渲染
    if (this.hasContextLost) {
      // 尝试检测上下文是否已恢复但事件尚未触发
      if (this.gl && !this.gl.isContextLost()) {
        console.log("检测到WebGL上下文已恢复，但事件未触发，手动重新初始化");
        this.hasContextLost = false;
        this.reinitialize();
      } else {
        // 显示上下文丢失信息
        this.renderContextLostMessage();
        return;
      }
    }

    if (this.useWebGL && this.gl) {
      // 添加额外的上下文检查
      let contextValid = true;
      try {
        // 尝试一个简单的WebGL操作，验证上下文是否真的可用
        this.gl.getParameter(this.gl.VERSION);
      } catch (e) {
        contextValid = false;
        this.hasContextLost = true;
      }

      if (!contextValid) {
        this.renderContextLostMessage();
        return;
      }

      try {
        this.renderWebGL(tiles, camera);
      } catch (error) {
        console.error("WebGL渲染失败:", error);
        // 检查是否是上下文丢失导致的
        if (this.gl.isContextLost && this.gl.isContextLost()) {
          this.hasContextLost = true;
          this.renderContextLostMessage();
        }
      }

      // 如果使用离屏canvas，复制到显示canvas
      if (this.useOffscreenCanvas && this.displayCanvas) {
        try {
          // 确保离屏Canvas和显示Canvas有尺寸
          const offscreenModified = this.ensureCanvasSize(this.canvas);
          const displayModified = this.ensureCanvasSize(this.displayCanvas);

          // 如果离屏Canvas尺寸被修改，需要重新设置WebGL视口
          if (offscreenModified && this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
          }

          const ctx = this.displayCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              this.canvas,
              0,
              0,
              this.displayCanvas.width,
              this.displayCanvas.height
            );
          }
        } catch (error) {
          console.error("复制离屏Canvas到显示Canvas失败:", error);
        }
      }
    } else if (this.ctx2d) {
      try {
        this.renderCanvas2D(tiles, camera);
      } catch (error) {
        console.error("Canvas 2D渲染失败:", error);
      }
    }

    // 更新帧率
    this.updateFPS();
  }

  /**
   * 使用WebGL渲染
   * @param {Array} tiles - 瓦片数组
   * @param {Camera} camera - 相机对象
   */
  renderWebGL(tiles, camera) {
    try {
      if (!tiles || tiles.length === 0) return;

      // 验证相机矩阵
      if (
        !camera ||
        !camera.matrix ||
        camera.matrix.some((v) => !isFinite(v))
      ) {
        console.error("相机矩阵无效");
        return;
      }

      // 清除画布
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      // 获取设备像素比
      const pixelRatio = window.devicePixelRatio || 1;

      // 设置WebGL视口以匹配canvas大小
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      // 启用抗锯齿
      if (this.gl.getContextAttributes().antialias) {
        // 如果WebGL上下文支持抗锯齿
        this.gl.enable(this.gl.SAMPLE_COVERAGE);
        this.gl.sampleCoverage(0.5, false);
      }

      // 使用着色器程序
      this.gl.useProgram(this.program);

      // 设置视图矩阵
      this.gl.uniformMatrix4fv(this.uniforms.matrix, false, camera.matrix);

      // 设置缩放级别
      this.gl.uniform1f(this.uniforms.zoom, camera.zoom);

      // 设置设备像素比
      if (this.uniforms.pixelRatio) {
        this.gl.uniform1f(this.uniforms.pixelRatio, pixelRatio);
      }

      // 设置顶点数据
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
      this.gl.enableVertexAttribArray(this.attributes.position);
      this.gl.vertexAttribPointer(
        this.attributes.position,
        2,
        this.gl.FLOAT,
        false,
        0,
        0
      );

      // 设置索引缓冲区
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

      // 分批渲染瓦片
      const batchSize = Math.min(this.maxInstanceCount, 2000); // 减小批次大小以提高稳定性
      for (let i = 0; i < tiles.length; i += batchSize) {
        try {
          const batchTiles = tiles.slice(i, i + batchSize);
          this.renderBatch(batchTiles);
        } catch (batchError) {
          console.error("渲染批次失败:", batchError, "跳过此批次");
          // 继续下一批次，避免一个批次失败导致整个渲染中断
        }
      }
    } catch (error) {
      console.error("WebGL渲染失败:", error);
      throw error; // 向上传递错误，以便外层处理上下文丢失
    }
  }

  /**
   * 渲染一批瓦片
   * @param {Array} tiles - 瓦片批次
   */
  renderBatch(tiles) {
    try {
      const count = tiles.length;

      // 准备实例化数据
      const instancePositions = new Float32Array(count * 2);
      const instanceColors = new Float32Array(count * 4);
      const instanceSizes = new Float32Array(count);

      // 填充实例化数据
      for (let i = 0; i < count; i++) {
        const tile = tiles[i];

        // 位置
        instancePositions[i * 2] = tile.x;
        instancePositions[i * 2 + 1] = tile.y;

        // 颜色
        instanceColors[i * 4] = tile.color[0];
        instanceColors[i * 4 + 1] = tile.color[1];
        instanceColors[i * 4 + 2] = tile.color[2];
        instanceColors[i * 4 + 3] = tile.color[3];

        // 大小
        instanceSizes[i] = tile.size;
      }

      // 设置实例化位置
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instancePosition);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        instancePositions,
        this.gl.DYNAMIC_DRAW
      );
      this.gl.enableVertexAttribArray(this.attributes.instancePosition);
      this.gl.vertexAttribPointer(
        this.attributes.instancePosition,
        2,
        this.gl.FLOAT,
        false,
        0,
        0
      );
      this.gl.vertexAttribDivisor(this.attributes.instancePosition, 1); // 实例化率

      // 设置实例化颜色
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceColor);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        instanceColors,
        this.gl.DYNAMIC_DRAW
      );
      this.gl.enableVertexAttribArray(this.attributes.instanceColor);
      this.gl.vertexAttribPointer(
        this.attributes.instanceColor,
        4,
        this.gl.FLOAT,
        false,
        0,
        0
      );
      this.gl.vertexAttribDivisor(this.attributes.instanceColor, 1); // 实例化率

      // 设置实例化大小
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceSize);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        instanceSizes,
        this.gl.DYNAMIC_DRAW
      );
      this.gl.enableVertexAttribArray(this.attributes.instanceSize);
      this.gl.vertexAttribPointer(
        this.attributes.instanceSize,
        1,
        this.gl.FLOAT,
        false,
        0,
        0
      );
      this.gl.vertexAttribDivisor(this.attributes.instanceSize, 1); // 实例化率

      // 绘制实例化方块
      this.gl.drawElementsInstanced(
        this.gl.TRIANGLES, // 模式
        6, // 索引数量
        this.gl.UNSIGNED_SHORT, // 索引类型
        0, // 偏移量
        count // 实例数量
      );
    } catch (error) {
      console.error("渲染批次失败:", error);
    }
  }

  /**
   * 使用Canvas 2D渲染 (降级方案)
   * @param {Array} tiles - 瓦片数组
   * @param {Camera} camera - 相机对象
   */
  renderCanvas2D(tiles, camera) {
    if (!tiles || tiles.length === 0 || !this.ctx2d) return;

    try {
      // 清除画布
      this.ctx2d.fillStyle = "#1a1a1a";
      this.ctx2d.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // 设置变换
      this.ctx2d.save();

      // 移动到中心
      this.ctx2d.translate(this.canvas.width / 2, this.canvas.height / 2);

      // 应用缩放
      this.ctx2d.scale(camera.zoom, camera.zoom);

      // 应用平移
      this.ctx2d.translate(-camera.position.x, -camera.position.y);

      // 限制渲染的瓦片数量以保持性能
      const maxTiles = Math.min(tiles.length, 5000);

      // 渲染瓦片
      for (let i = 0; i < maxTiles; i++) {
        const tile = tiles[i];

        // 设置颜色
        this.ctx2d.fillStyle = `rgba(${tile.color[0] * 255}, ${
          tile.color[1] * 255
        }, ${tile.color[2] * 255}, ${tile.color[3]})`;

        // 绘制方块
        const halfSize = tile.size / 2;
        this.ctx2d.fillRect(
          tile.x - halfSize,
          tile.y - halfSize,
          tile.size,
          tile.size
        );
      }

      // 恢复变换
      this.ctx2d.restore();

      // 显示降级渲染信息
      this.ctx2d.fillStyle = "rgba(255, 255, 255, 0.7)";
      this.ctx2d.font = "12px Arial";
      this.ctx2d.textAlign = "left";
      this.ctx2d.fillText(
        `使用Canvas 2D降级渲染 (显示${maxTiles}/${tiles.length}个瓦片)`,
        10,
        20
      );
    } catch (error) {
      console.error("Canvas 2D渲染失败:", error);
    }
  }

  /**
   * 更新帧率计算
   */
  updateFPS() {
    try {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      this.lastFrameTime = now;

      // 累积帧时间
      this.frameTimeAccumulator += elapsed;
      this.frameCount++;

      // 每秒更新一次FPS显示
      if (this.frameTimeAccumulator >= 1000) {
        this.fps = Math.round(
          (this.frameCount * 1000) / this.frameTimeAccumulator
        );

        const fpsElement = document.getElementById("fps");
        if (fpsElement) {
          fpsElement.textContent = this.fps;
        }

        this.frameTimeAccumulator = 0;
        this.frameCount = 0;
      }
    } catch (error) {
      console.error("更新FPS失败:", error);
    }
  }

  /**
   * 渲染上下文丢失消息
   */
  renderContextLostMessage() {
    try {
      // 尝试使用2D上下文渲染消息
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = "#ff5252";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "WebGL上下文丢失，正在尝试恢复...",
          this.canvas.width / 2,
          this.canvas.height / 2
        );
      }
    } catch (error) {
      console.error("渲染上下文丢失消息失败:", error);
    }
  }
}

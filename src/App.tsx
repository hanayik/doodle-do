import { useRef, useEffect, useState } from "react";
import {
  Pen,
  Highlighter,
  Eraser,
  Undo,
  Redo,
  Trash2,
  GripVertical,
} from "lucide-react";

const vertexShaderSource = `#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;

void main() {
  vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec3 u_color;
uniform float u_alpha;
out vec4 outColor;

void main() {
  outColor = vec4(u_color, u_alpha);
}`;

interface Point {
  x: number;
  y: number;
}

type Tool = "pen" | "highlighter" | "eraser";

interface Stroke {
  points: Point[];
  color: string;
  tool: Tool;
  lineWidth: number;
  opacity: number;
}

interface ToolbarProps {
  selectedTool: Tool;
  selectedColor: string;
  size: number;
  penOpacity: number;
  highlighterOpacity: number;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const OpacitySlider = ({
  opacity,
  onOpacityChange,
}: {
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const handlePointerMove = (e: PointerEvent) => {
      const padding = 8;
      const effectiveHeight = rect.height - padding * 2;
      const y = Math.max(
        0,
        Math.min(1, (rect.bottom - e.clientY - padding) / effectiveHeight)
      );
      const newOpacity = Math.round(y * 100);
      onOpacityChange(newOpacity);
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    handlePointerMove(e.nativeEvent);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        width: 16,
        height: 80,
        background: "white",
        borderRadius: 8,
        position: "relative",
        cursor: "pointer",
        padding: "8px 0",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 0,
          right: 0,
          bottom: 8,
          background: "#666666",
          clipPath: "polygon(0 0, 50% 100%, 100% 0)",
          borderRadius: 8,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${8 + ((100 - opacity) * (80 - 16)) / 100}px`,
          width: 12,
          height: 12,
          backgroundColor: "#007AFF",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          border: "2px solid white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
};

const SizeSlider = ({
  size,
  onSizeChange,
  minSize,
  maxSize,
}: {
  size: number;
  onSizeChange: (size: number) => void;
  minSize: number;
  maxSize: number;
}) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const handlePointerMove = (e: PointerEvent) => {
      const padding = 8;
      const effectiveWidth = rect.width - padding * 2;
      const x = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left - padding) / effectiveWidth)
      );
      const newSize = Math.round(minSize + (maxSize - minSize) * x);
      onSizeChange(newSize);
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    handlePointerMove(e.nativeEvent);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        width: "100%",
        height: 16,
        background: "white",
        borderRadius: 8,
        position: "relative",
        cursor: "pointer",
        padding: "0 8px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 8,
          right: 8,
          bottom: 0,
          background: "#666666",
          clipPath: "polygon(0 50%, 100% 0, 100% 100%)",
          borderRadius: 8,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${8 + ((size - minSize) / (maxSize - minSize)) * (100 - 16)}%`,
          width: 12,
          height: 12,
          backgroundColor: "#007AFF",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          border: "2px solid white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
};

const Toolbar = ({
  selectedTool,
  selectedColor,
  size,
  penOpacity,
  highlighterOpacity,
  onToolChange,
  onColorChange,
  onSizeChange,
  onOpacityChange,
  onUndo,
  onRedo,
  onClear,
}: ToolbarProps) => {
  const colors = [
    "#000000",
    "#007AFF",
    "#34C759",
    "#FFCC00",
    "#FF3B30",
    "#AF52DE",
  ];
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget
      .closest("[data-toolbar]")
      ?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleDrag = (e: PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("pointermove", handleDrag);
      document.addEventListener("pointerup", handleDragEnd);
      return () => {
        document.removeEventListener("pointermove", handleDrag);
        document.removeEventListener("pointerup", handleDragEnd);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      data-toolbar
      style={{
        position: "fixed",
        bottom: position.x === 0 && position.y === 0 ? 20 : "auto",
        left: position.x === 0 && position.y === 0 ? "50%" : position.x,
        top: position.x === 0 && position.y === 0 ? "auto" : position.y,
        transform:
          position.x === 0 && position.y === 0 ? "translateX(-50%)" : "none",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 20,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 15,
        boxShadow: "0 2px 20px rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(10px)",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onUndo}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#f0f0f0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Undo size={18} />
        </button>
        <button
          onClick={onRedo}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#f0f0f0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Redo size={18} />
        </button>
      </div>

      <div style={{ width: 1, height: 30, backgroundColor: "#e0e0e0" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <OpacitySlider
          opacity={
            selectedTool === "pen"
              ? penOpacity
              : selectedTool === "highlighter"
              ? highlighterOpacity
              : 100
          }
          onOpacityChange={onOpacityChange}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 170,
          }}
        >
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => onToolChange("pen")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "none",
                backgroundColor:
                  selectedTool === "pen" ? "#e0e0e0" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pen size={20} />
            </button>
            <button
              onClick={() => onToolChange("highlighter")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "none",
                backgroundColor:
                  selectedTool === "highlighter" ? "#e0e0e0" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Highlighter size={20} />
            </button>
            <button
              onClick={() => onToolChange("eraser")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "none",
                backgroundColor:
                  selectedTool === "eraser" ? "#e0e0e0" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Eraser size={20} />
            </button>
            <button
              onClick={onClear}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "none",
                backgroundColor: "#ffb3b3",
                cursor: "pointer",
                color: "#ff0000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div style={{ width: "100%" }}>
            <SizeSlider
              size={size}
              onSizeChange={onSizeChange}
              minSize={1}
              maxSize={30}
            />
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 30, backgroundColor: "#e0e0e0" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border:
                selectedColor === color
                  ? "3px solid #007AFF"
                  : "2px solid #e0e0e0",
              backgroundColor: color,
              cursor: "pointer",
              position: "relative",
            }}
          >
            {color === "#AF52DE" && (
              <div
                style={{
                  position: "absolute",
                  inset: 2,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(45deg, #FF3B30 0%, #FFCC00 25%, #34C759 50%, #007AFF 75%, #AF52DE 100%)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      <button
        onPointerDown={handleDragStart}
        style={{
          marginLeft: 10,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          backgroundColor: "#f0f0f0",
          cursor: isDragging ? "grabbing" : "grab",
          color: "#666",
        }}
      >
        <GripVertical size={20} />
      </button>
    </div>
  );
};

const DrawingCanvas = () => {
  const [selectedTool, setSelectedTool] = useState<Tool>("pen");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [size, setSize] = useState(5);
  const [penOpacity, setPenOpacity] = useState(100);
  const [highlighterOpacity, setHighlighterOpacity] = useState(10);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const resolutionLocationRef = useRef<WebGLUniformLocation | null>(null);
  const colorLocationRef = useRef<WebGLUniformLocation | null>(null);
  const alphaLocationRef = useRef<WebGLUniformLocation | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point>({ x: 0, y: 0 });
  const pixelRatioRef = useRef(1);
  const currentStrokeRef = useRef<Point[]>([]);

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255,
        ]
      : [0, 0, 0];
  };

  const drawStrokeCircle = (center: Point, radius: number) => {
    if (!glRef.current || !programRef.current || !positionBufferRef.current)
      return;

    const gl = glRef.current;
    const segments = Math.max(8, Math.floor(radius / 2));
    const vertices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;

      if (i === 0) {
        vertices.push(center.x, center.y);
      }
      vertices.push(x, y);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);
  };

  const redrawCanvas = () => {
    const gl = glRef.current;
    if (!gl || !colorLocationRef.current || !alphaLocationRef.current) return;

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const activeStrokes = strokes.slice(0, currentStrokeIndex + 1);

    activeStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      if (stroke.tool === "eraser") {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform3f(colorLocationRef.current, 1.0, 1.0, 1.0);
        gl.uniform1f(alphaLocationRef.current, 1.0);
      } else if (stroke.tool === "highlighter") {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        const [r, g, b] = hexToRgb(stroke.color);
        const alpha = (stroke.opacity / 100) * 0.1;
        gl.uniform3f(colorLocationRef.current, r * alpha, g * alpha, b * alpha);
        gl.uniform1f(alphaLocationRef.current, alpha);
      } else {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const [r, g, b] = hexToRgb(stroke.color);
        gl.uniform3f(colorLocationRef.current, r, g, b);
        gl.uniform1f(alphaLocationRef.current, stroke.opacity / 100);
      }

      const lineWidth = stroke.lineWidth * pixelRatioRef.current;

      if (stroke.points.length === 1) {
        drawStrokeCircle(stroke.points[0], lineWidth / 2);
        return;
      }

      for (let i = 1; i < stroke.points.length; i++) {
        const from = stroke.points[i - 1];
        const to = stroke.points[i];

        const bresenhamPoints = plotLine(
          Math.round(from.x),
          Math.round(from.y),
          Math.round(to.x),
          Math.round(to.y)
        );

        for (const point of bresenhamPoints) {
          drawStrokeCircle(point, lineWidth / 2);
        }
      }
    });
  };

  const handleUndo = () => {
    if (currentStrokeIndex >= 0) {
      setCurrentStrokeIndex(currentStrokeIndex - 1);
    }
  };

  const handleRedo = () => {
    if (currentStrokeIndex < strokes.length - 1) {
      setCurrentStrokeIndex(currentStrokeIndex + 1);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStrokeIndex(-1);
    const gl = glRef.current;
    if (!gl) return;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const createShader = (
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const createProgram = (
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  };

  const drawCircle = (center: Point, radius: number) => {
    if (!glRef.current || !programRef.current || !positionBufferRef.current)
      return;

    const gl = glRef.current;
    const segments = Math.max(8, Math.floor(radius / 2));
    const vertices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;

      if (i === 0) {
        vertices.push(center.x, center.y);
      }
      vertices.push(x, y);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);
  };

  const plotLineLow = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    points: Point[]
  ) => {
    const dx = x1 - x0;
    let dy = y1 - y0;
    let yi = 1;
    if (dy < 0) {
      yi = -1;
      dy = -dy;
    }
    let D = 2 * dy - dx;
    let y = y0;

    for (let x = x0; x <= x1; x++) {
      points.push({ x, y });
      if (D > 0) {
        y = y + yi;
        D = D + 2 * (dy - dx);
      } else {
        D = D + 2 * dy;
      }
    }
  };

  const plotLineHigh = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    points: Point[]
  ) => {
    let dx = x1 - x0;
    const dy = y1 - y0;
    let xi = 1;
    if (dx < 0) {
      xi = -1;
      dx = -dx;
    }
    let D = 2 * dx - dy;
    let x = x0;

    for (let y = y0; y <= y1; y++) {
      points.push({ x, y });
      if (D > 0) {
        x = x + xi;
        D = D + 2 * (dx - dy);
      } else {
        D = D + 2 * dx;
      }
    }
  };

  const plotLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): Point[] => {
    const points: Point[] = [];

    if (Math.abs(y1 - y0) < Math.abs(x1 - x0)) {
      if (x0 > x1) {
        plotLineLow(x1, y1, x0, y0, points);
      } else {
        plotLineLow(x0, y0, x1, y1, points);
      }
    } else {
      if (y0 > y1) {
        plotLineHigh(x1, y1, x0, y0, points);
      } else {
        plotLineHigh(x0, y0, x1, y1, points);
      }
    }

    return points;
  };

  const drawLine = (from: Point, to: Point) => {
    if (
      !glRef.current ||
      !programRef.current ||
      !positionBufferRef.current ||
      !colorLocationRef.current ||
      !alphaLocationRef.current
    )
      return;

    const gl = glRef.current;
    const lineWidth = size * pixelRatioRef.current;

    if (selectedTool === "eraser") {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform3f(colorLocationRef.current, 1.0, 1.0, 1.0);
      gl.uniform1f(alphaLocationRef.current, 1.0);
    } else if (selectedTool === "highlighter") {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const [r, g, b] = hexToRgb(selectedColor);
      const alpha = (highlighterOpacity / 100) * 0.1;
      gl.uniform3f(colorLocationRef.current, r * alpha, g * alpha, b * alpha);
      gl.uniform1f(alphaLocationRef.current, alpha);
    } else {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const [r, g, b] = hexToRgb(selectedColor);
      gl.uniform3f(colorLocationRef.current, r, g, b);
      gl.uniform1f(alphaLocationRef.current, penOpacity / 100);
    }

    const bresenhamPoints = plotLine(
      Math.round(from.x),
      Math.round(from.y),
      Math.round(to.x),
      Math.round(to.y)
    );

    for (const point of bresenhamPoints) {
      drawCircle(point, lineWidth / 2);
    }
  };

  useEffect(() => {
    if (glRef.current && colorLocationRef.current) {
      redrawCanvas();
    }
  }, [currentStrokeIndex, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }
    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    programRef.current = program;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    resolutionLocationRef.current = gl.getUniformLocation(
      program,
      "u_resolution"
    );
    colorLocationRef.current = gl.getUniformLocation(program, "u_color");
    alphaLocationRef.current = gl.getUniformLocation(program, "u_alpha");

    const positionBuffer = gl.createBuffer();
    positionBufferRef.current = positionBuffer;

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      pixelRatioRef.current = pixelRatio;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;

      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.useProgram(program);
      gl.uniform2f(resolutionLocationRef.current, canvas.width, canvas.height);
      if (colorLocationRef.current) {
        const [r, g, b] = hexToRgb(selectedColor);
        gl.uniform3f(colorLocationRef.current, r, g, b);
      }
      if (alphaLocationRef.current) {
        gl.uniform1f(alphaLocationRef.current, 1.0);
      }

      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    gl.useProgram(program);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * pixelRatioRef.current;
    const y = (e.clientY - rect.top) * pixelRatioRef.current;
    lastPointRef.current = { x, y };
    currentStrokeRef.current = [{ x, y }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) * pixelRatioRef.current;
    const y = (e.clientY - rect.top) * pixelRatioRef.current;

    drawLine(lastPointRef.current, { x, y });
    lastPointRef.current = { x, y };
    currentStrokeRef.current.push({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 0) {
      const newStroke: Stroke = {
        points: [...currentStrokeRef.current],
        color: selectedTool === "eraser" ? "#FFFFFF" : selectedColor,
        tool: selectedTool,
        lineWidth: size,
        opacity:
          selectedTool === "pen"
            ? penOpacity
            : selectedTool === "highlighter"
            ? highlighterOpacity
            : 100,
      };

      const newStrokes = [
        ...strokes.slice(0, currentStrokeIndex + 1),
        newStroke,
      ];
      setStrokes(newStrokes);
      setCurrentStrokeIndex(newStrokes.length - 1);
      currentStrokeRef.current = [];
    }
  };

  const handleOpacityChange = (opacity: number) => {
    if (selectedTool === "pen") {
      setPenOpacity(opacity);
    } else if (selectedTool === "highlighter") {
      setHighlighterOpacity(opacity);
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          display: "block",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <Toolbar
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        size={size}
        penOpacity={penOpacity}
        highlighterOpacity={highlighterOpacity}
        onToolChange={setSelectedTool}
        onColorChange={setSelectedColor}
        onSizeChange={setSize}
        onOpacityChange={handleOpacityChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
      />
    </>
  );
};

export function App() {
  return <DrawingCanvas />;
}

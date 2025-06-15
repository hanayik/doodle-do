import { useRef, useEffect } from "react";

const PencilOnlyCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Set CSS size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Set actual pixel size
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;

      // Scale the context to match device pixel ratio
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any existing transforms
      ctx.scale(pixelRatio, pixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "pen") return; // Only allow Apple Pencil
    e.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || e.pointerType !== "pen") return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2; // in CSS pixels
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();

    lastPointRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "pen") return;
    e.preventDefault();
    isDrawingRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        touchAction: "none", // Prevent default touch actions
        display: "block",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
};

export function App() {
  return <PencilOnlyCanvas />;
}

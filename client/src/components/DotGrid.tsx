// Checkpoint test
import React, { useEffect, useRef, useState } from 'react';

interface Dot {
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

const DotGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  const dotSize = 2;
  const dotSpacing = 30;
  const proximityDistance = 80;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateDots();
    };

    const generateDots = () => {
      const newDots: Dot[] = [];
      const cols = Math.ceil(canvas.width / dotSpacing);
      const rows = Math.ceil(canvas.height / dotSpacing);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          newDots.push({
            x: i * dotSpacing,
            y: j * dotSpacing,
            opacity: 0.3,
            scale: 1,
          });
        }
      }
      setDots(newDots);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      dots.forEach((dot) => {
        const distance = Math.sqrt(
          Math.pow(dot.x - mousePos.x, 2) + Math.pow(dot.y - mousePos.y, 2)
        );
        
        let opacity = 0.3;
        let scale = 1;
        
        if (distance < proximityDistance) {
          const factor = 1 - distance / proximityDistance;
          opacity = 0.3 + factor * 0.7;
          scale = 1 + factor * 2;
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = `hsl(270, 60%, ${50 + (opacity - 0.3) * 50}%)`;
        
        const size = dotSize * scale;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect for nearby dots
        if (distance < proximityDistance) {
          ctx.shadowColor = `hsl(270, 60%, 60%)`;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dots, mousePos]);

  return (
    <canvas
      ref={canvasRef}
      className="dot-grid"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default DotGrid;
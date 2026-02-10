"use client";

import { useEffect, useRef, useCallback } from "react";

export function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientCacheRef = useRef<Map<string, CanvasGradient>>(new Map());
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dotsRef = useRef<
    { x: number; y: number; opacity: number; pulse: number }[]
  >([]);

  // Pre-create gradient cache for performance
  const getOrCreateGradient = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      opacity: number,
    ): CanvasGradient => {
      // Use a cache key based on rounded values to reduce cache size
      const key = `${Math.round(x)}_${Math.round(y)}_${Math.round(radius * 10)}_${Math.round(opacity * 100)}`;

      let gradient = gradientCacheRef.current.get(key);
      if (!gradient) {
        gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(138, 43, 226, ${opacity})`);
        gradient.addColorStop(1, `rgba(218, 112, 214, ${opacity * 0.3})`);

        // Limit cache size to prevent memory issues
        if (gradientCacheRef.current.size > 500) {
          const firstKey = gradientCacheRef.current.keys().next().value;
          if (firstKey) gradientCacheRef.current.delete(firstKey);
        }
        gradientCacheRef.current.set(key, gradient);
      }
      return gradient;
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Throttled resize handler
    let resizeTimeout: NodeJS.Timeout;
    const resizeCanvas = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.scale(dpr, dpr);

        // Recreate dots on resize
        initializeDots();
        // Clear gradient cache on resize since positions change
        gradientCacheRef.current.clear();
      }, 100);
    };

    const initializeDots = () => {
      const spacing = 60; // Slightly increased from 50 for better perf
      const maxOpacity = 0.4;
      const dots: typeof dotsRef.current = [];

      for (let x = 0; x < window.innerWidth; x += spacing) {
        for (let y = 0; y < window.innerHeight; y += spacing) {
          dots.push({
            x: x + Math.random() * 20 - 10,
            y: y + Math.random() * 20 - 10,
            opacity: Math.random() * maxOpacity,
            pulse: Math.random() * Math.PI * 2,
          });
        }
      }
      dotsRef.current = dots;
    };

    // Throttled mouse handler - update every 50ms max
    let lastMouseUpdate = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseUpdate > 50) {
        mouseRef.current = { x: e.clientX, y: e.clientY };
        lastMouseUpdate = now;
      }
    };

    // Visibility API - pause animation when tab is not visible
    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !animationRef.current) {
        animate();
      }
    };

    // Animation loop with frame limiting
    let lastFrame = 0;
    const targetFPS = 30; // Cap at 30fps for performance
    const frameInterval = 1000 / targetFPS;
    const maxOpacity = 0.4;

    const animate = () => {
      if (!isVisible) {
        animationRef.current = 0;
        return;
      }

      const now = performance.now();
      const delta = now - lastFrame;

      if (delta >= frameInterval) {
        lastFrame = now - (delta % frameInterval);

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const mouseX = mouseRef.current.x;
        const mouseY = mouseRef.current.y;
        const maxDistance = 150;

        dotsRef.current.forEach((dot) => {
          const dx = mouseX - dot.x;
          const dy = mouseY - dot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - distance / maxDistance);

          dot.pulse += 0.02;
          const pulseOpacity = Math.sin(dot.pulse) * 0.1;
          const finalOpacity =
            (dot.opacity + influence * 0.5 + pulseOpacity) * maxOpacity;
          const radius = 3 + influence * 2;

          // Use cached gradient
          const gradient = getOrCreateGradient(
            ctx,
            dot.x,
            dot.y,
            radius,
            finalOpacity,
          );
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 2 + influence * 2, 0, Math.PI * 2);
          ctx.fill();

          // Only draw connection lines for strong proximity
          if (influence > 0.4) {
            ctx.strokeStyle = `rgba(138, 43, 226, ${influence * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start animation
    animate();

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      gradientCacheRef.current.clear();
    };
  }, [getOrCreateGradient]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "transparent" }}
        aria-hidden="true"
      />
      <div className="scan-line" />
    </>
  );
}

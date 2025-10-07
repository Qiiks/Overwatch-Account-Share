"use client"

import { useEffect, useState } from "react"

interface LiquidMorphTransitionProps {
  isActive: boolean
}

export function LiquidMorphTransition({ isActive }: LiquidMorphTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "expanding" | "morphing" | "contracting">("idle")

  useEffect(() => {
    if (isActive) {
      setPhase("expanding")

      const timer1 = setTimeout(() => setPhase("morphing"), 400)
      const timer2 = setTimeout(() => setPhase("contracting"), 800)
      const timer3 = setTimeout(() => setPhase("idle"), 1200)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }
  }, [isActive])

  if (!isActive && phase === "idle") return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Liquid blob shapes */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full transition-all duration-500 ease-in-out ${
            phase === "expanding"
              ? "scale-150 opacity-80"
              : phase === "morphing"
                ? "scale-200 opacity-60"
                : phase === "contracting"
                  ? "scale-100 opacity-40"
                  : "scale-0 opacity-0"
          }`}
          style={{
            background: `radial-gradient(circle, 
              hsl(${240 + i * 30}, 70%, 60%) 0%, 
              hsl(${260 + i * 30}, 80%, 50%) 50%, 
              transparent 70%)`,
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            left: `${10 + i * 12}%`,
            top: `${5 + i * 11}%`,
            filter: "blur(2px)",
            transform: `rotate(${i * 45}deg)`,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}

      {/* Morphing overlay */}
      <div
        className={`absolute inset-0 transition-all duration-600 ease-in-out ${
          phase === "expanding" || phase === "morphing"
            ? "bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-cyan-900/50 backdrop-blur-sm"
            : "bg-transparent"
        }`}
        style={{
          clipPath:
            phase === "expanding"
              ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
              : phase === "morphing"
                ? "polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)"
                : phase === "contracting"
                  ? "polygon(40% 40%, 60% 40%, 60% 60%, 40% 60%)"
                  : "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
        }}
      />
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

interface QuantumRippleTransitionProps {
  isActive: boolean
}

export function QuantumRippleTransition({ isActive }: QuantumRippleTransitionProps) {
  const [ripples, setRipples] = useState<
    Array<{
      id: number
      x: number
      y: number
      delay: number
      scale: number
    }>
  >([])

  useEffect(() => {
    if (isActive) {
      // Generate quantum ripples from multiple points
      const newRipples = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 20 + (i % 4) * 20,
        y: 20 + Math.floor(i / 4) * 20,
        delay: i * 100,
        scale: 0.5 + Math.random() * 1.5,
      }))

      setRipples(newRipples)

      const timer = setTimeout(() => setRipples([]), 1500)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (!isActive || ripples.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Quantum field background */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-blue-900/20 to-transparent animate-pulse" />

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <div key={ripple.id} className="absolute" style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}>
          {/* Multiple concentric ripples */}
          {[...Array(4)].map((_, ringIndex) => (
            <div
              key={ringIndex}
              className="absolute rounded-full border-2 animate-ping"
              style={{
                width: `${100 * ripple.scale}px`,
                height: `${100 * ripple.scale}px`,
                borderColor: `hsl(${280 + ringIndex * 20}, 80%, ${60 + ringIndex * 10}%)`,
                animationDelay: `${ripple.delay + ringIndex * 150}ms`,
                animationDuration: "1000ms",
                transform: "translate(-50%, -50%)",
                boxShadow: `0 0 20px hsl(${280 + ringIndex * 20}, 80%, ${60 + ringIndex * 10}%)`,
              }}
            />
          ))}

          {/* Central energy core */}
          <div
            className="absolute w-4 h-4 rounded-full animate-pulse"
            style={{
              backgroundColor: `hsl(${300}, 90%, 70%)`,
              transform: "translate(-50%, -50%)",
              animationDelay: `${ripple.delay}ms`,
              boxShadow: "0 0 15px hsl(300, 90%, 70%)",
            }}
          />
        </div>
      ))}

      {/* Quantum interference patterns */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="w-full h-full"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.2) 0%, transparent 70%)
            `,
            animation: "quantumShift 1.2s ease-in-out",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes quantumShift {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0;
          }
          50% { 
            transform: scale(1.2) rotate(180deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

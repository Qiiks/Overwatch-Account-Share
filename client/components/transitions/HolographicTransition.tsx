"use client"

import { useEffect, useState } from "react"

interface HolographicTransitionProps {
  isActive: boolean
}

export function HolographicTransition({ isActive }: HolographicTransitionProps) {
  const [scanLines, setScanLines] = useState<number[]>([])

  useEffect(() => {
    if (isActive) {
      // Generate scan line positions
      const lines = Array.from({ length: 20 }, (_, i) => i * 5)
      setScanLines(lines)

      const timer = setTimeout(() => setScanLines([]), 1200)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Holographic base */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 animate-pulse" />

      {/* Glitch effect */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 255, 0.1) 2px,
            rgba(0, 255, 255, 0.1) 4px
          )`,
          animation: "glitch 0.3s infinite",
        }}
      />

      {/* Scan lines */}
      {scanLines.map((position, i) => (
        <div
          key={i}
          className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"
          style={{
            top: `${position}%`,
            animationDelay: `${i * 50}ms`,
            boxShadow: "0 0 10px rgba(0, 255, 255, 0.8)",
          }}
        />
      ))}

      {/* Holographic grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          animation: "gridMove 2s linear infinite",
        }}
      />

      {/* Digital noise */}
      <div className="absolute inset-0 opacity-20 animate-pulse bg-noise" />

      <style jsx>{`
        @keyframes glitch {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          60% { transform: translateX(-1px); }
          80% { transform: translateX(1px); }
        }
        
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        .bg-noise {
          background-image: 
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 200, 255, 0.3) 0%, transparent 50%);
        }
      `}</style>
    </div>
  )
}

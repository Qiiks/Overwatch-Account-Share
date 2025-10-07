"use client"

import { useEffect, useState } from "react"

interface ParticleDissolveTransitionProps {
  isActive: boolean
}

export function ParticleDissolveTransition({ isActive }: ParticleDissolveTransitionProps) {
  const [particles, setParticles] = useState<
    Array<{
      id: number
      x: number
      y: number
      size: number
      delay: number
      color: string
    }>
  >([])

  useEffect(() => {
    if (isActive) {
      // Generate particles
      const newParticles = Array.from({ length: 150 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 2,
        delay: Math.random() * 800,
        color: `hsl(${200 + Math.random() * 160}, 70%, ${50 + Math.random() * 30}%)`,
      }))

      setParticles(newParticles)

      // Clear particles after animation
      const timer = setTimeout(() => setParticles([]), 1500)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (!isActive || particles.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Dissolve overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-pink-900/30 animate-pulse" />

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-ping"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}ms`,
            animationDuration: "1000ms",
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Energy waves */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`wave-${i}`}
          className="absolute inset-0 rounded-full border-2 animate-ping"
          style={{
            borderColor: `hsl(${240 + i * 30}, 70%, 60%)`,
            animationDelay: `${i * 200}ms`,
            animationDuration: "1200ms",
            transform: "scale(0)",
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  )
}

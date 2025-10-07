"use client"

import { useEffect, useRef } from "react"

export function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const dots: { x: number; y: number; opacity: number; pulse: number }[] = []
    const spacing = 50
    const maxOpacity = 0.4

    // Create dot grid
    for (let x = 0; x < canvas.width; x += spacing) {
      for (let y = 0; y < canvas.height; y += spacing) {
        dots.push({
          x: x + Math.random() * 20 - 10,
          y: y + Math.random() * 20 - 10,
          opacity: Math.random() * maxOpacity,
          pulse: Math.random() * Math.PI * 2,
        })
      }
    }

    let mouseX = 0
    let mouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    window.addEventListener("mousemove", handleMouseMove)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      dots.forEach((dot, index) => {
        const distance = Math.sqrt((mouseX - dot.x) ** 2 + (mouseY - dot.y) ** 2)
        const maxDistance = 150
        const influence = Math.max(0, 1 - distance / maxDistance)

        dot.pulse += 0.02
        const pulseOpacity = Math.sin(dot.pulse) * 0.1
        const finalOpacity = (dot.opacity + influence * 0.5 + pulseOpacity) * maxOpacity

        const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 3)
        gradient.addColorStop(0, `rgba(0, 255, 255, ${finalOpacity})`)
        gradient.addColorStop(1, `rgba(0, 255, 200, ${finalOpacity * 0.3})`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, 2 + influence * 2, 0, Math.PI * 2)
        ctx.fill()

        if (influence > 0.3) {
          ctx.strokeStyle = `rgba(0, 255, 255, ${influence * 0.2})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(dot.x, dot.y)
          ctx.lineTo(mouseX, mouseY)
          ctx.stroke()
        }
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ background: "transparent" }} />
      <div className="scan-line" />
    </>
  )
}

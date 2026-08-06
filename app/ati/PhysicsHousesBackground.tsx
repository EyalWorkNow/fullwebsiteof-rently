'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  homeX: number
  homeY: number
  vx: number
  vy: number
  size: number
  rotation: number
  vRot: number
  color: string
  borderColor: string
  shapeType: 'house' | 'building' | 'cottage'
}

export default function PhysicsHousesBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const c2d: CanvasRenderingContext2D = ctx

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const mouse = {
      x: -9999,
      y: -9999,
    }

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      initParticles()
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    let particles: Particle[] = []

    const colors = [
      { fill: 'rgba(0, 97, 255, 0.15)', stroke: 'rgba(0, 97, 255, 0.4)' },
      { fill: 'rgba(56, 182, 255, 0.18)', stroke: 'rgba(56, 182, 255, 0.45)' },
      { fill: 'rgba(15, 138, 128, 0.15)', stroke: 'rgba(15, 138, 128, 0.38)' },
      { fill: 'rgba(99, 102, 241, 0.14)', stroke: 'rgba(99, 102, 241, 0.38)' },
    ]

    function initParticles() {
      particles = []
      // 32 tiny house objects scattered across the screen
      const count = Math.min(Math.floor((width * height) / 24000), 40)

      for (let i = 0; i < count; i++) {
        const homeX = Math.random() * (width - 80) + 40
        const homeY = Math.random() * (height - 80) + 40

        // Initial drop simulation: start above homeY so they fall once into position
        const startY = homeY - Math.random() * 250 - 150
        const palette = colors[Math.floor(Math.random() * colors.length)]
        const shapes: ('house' | 'building' | 'cottage')[] = ['house', 'building', 'cottage']

        particles.push({
          x: homeX,
          y: startY,
          homeX,
          homeY,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 3 + 2, // initial downward drop speed
          size: Math.random() * 8 + 12, // tiny size: 12px to 20px
          rotation: (Math.random() - 0.5) * 0.4,
          vRot: 0,
          color: palette.fill,
          borderColor: palette.stroke,
          shapeType: shapes[Math.floor(Math.random() * shapes.length)],
        })
      }
    }

    initParticles()

    function drawHouse(ctx: CanvasRenderingContext2D, p: Particle) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      ctx.strokeStyle = p.borderColor
      ctx.lineWidth = 1.4

      const s = p.size
      ctx.beginPath()

      if (p.shapeType === 'building') {
        // Tall building with flat roof & antenna
        const w = s * 0.7
        const h = s * 1.2
        ctx.rect(-w / 2, -h / 2, w, h)
      } else if (p.shapeType === 'cottage') {
        // Cottage with chimney
        const w = s
        const h = s * 0.7
        ctx.moveTo(-w / 2, -h / 2)
        ctx.lineTo(0, -h - s * 0.4)
        ctx.lineTo(w / 2, -h / 2)
        ctx.lineTo(w / 2, h / 2)
        ctx.lineTo(-w / 2, h / 2)
      } else {
        // Classic house with pitched roof
        const halfS = s / 2
        ctx.moveTo(0, -s * 0.65)
        ctx.lineTo(halfS, -halfS * 0.2)
        ctx.lineTo(halfS * 0.7, -halfS * 0.2)
        ctx.lineTo(halfS * 0.7, halfS)
        ctx.lineTo(-halfS * 0.7, halfS)
        ctx.lineTo(-halfS * 0.7, -halfS * 0.2)
        ctx.lineTo(-halfS, -halfS * 0.2)
      }

      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Tiny door / window line for detail
      ctx.fillStyle = p.borderColor
      ctx.fillRect(-p.size * 0.15, p.size * 0.15, p.size * 0.3, p.size * 0.35)

      ctx.restore()
    }

    function animate() {
      c2d.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // 1. Mouse Repulsion Physics
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const repelRadius = 140

        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius
          const angle = Math.atan2(dy, dx)
          const push = force * 6

          p.vx += Math.cos(angle) * push
          p.vy += Math.sin(angle) * push
          p.vRot += (Math.random() - 0.5) * 0.1
        }

        // 2. Spring Back to Home (Rest) Position
        const homeDx = p.homeX - p.x
        const homeDy = p.homeY - p.y
        p.vx += homeDx * 0.035
        p.vy += homeDy * 0.035

        // 3. Friction / Damping
        p.vx *= 0.88
        p.vy *= 0.88
        p.vRot *= 0.85

        // Update positions & rotation
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.vRot + p.vx * 0.015

        // Boundary constraints
        p.x = Math.max(20, Math.min(width - 20, p.x))
        p.y = Math.max(20, Math.min(height - 20, p.y))

        drawHouse(c2d, p)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-80"
    />
  )
}

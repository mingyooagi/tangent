'use client'

import { useTangent } from 'tangent-core'

export function Hero() {
  const styles = useTangent('HeroSection', {
    padding: 80,
    headerColor: '#00ff9f',
    fontSize: 48,
    opacity: 1,
    heroGradient: 'radial-gradient(circle, rgba(0, 255, 159, 0.15) 0%, rgba(0, 212, 255, 0.1) 50%, transparent 100%)',
    titleShadow: '0px 0px 40px 0px rgba(0, 255, 159, 0.4)',
  })

  return (
    <div
      style={{
        padding: `${styles.padding}px`,
        textAlign: 'center',
        background: styles.heroGradient,
        borderRadius: '16px',
        border: '1px solid rgba(0, 255, 159, 0.2)',
      }}
    >
      <h1
        style={{
          color: styles.headerColor,
          fontSize: `${styles.fontSize}px`,
          fontWeight: 700,
          opacity: styles.opacity,
          textShadow: styles.titleShadow,
          marginBottom: '16px',
        }}
      >
        Welcome to Tangent
      </h1>
      <p style={{ color: '#888', fontSize: '18px' }}>
        Visual Tuner for AI-Generated Code (Next.js)
      </p>
    </div>
  )
}
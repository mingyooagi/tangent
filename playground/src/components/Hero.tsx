import { useTangent } from 'tangent-core'

export function Hero() {
  const styles = useTangent('HeroSection', {
    padding: 60,
    headerColor: '#00ff9f',
    fontSize: 48,
    opacity: 1,
  })

  return (
    <div
      style={{
        padding: `${styles.padding}px`,
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(0, 255, 159, 0.1) 0%, transparent 100%)',
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
          textShadow: `0 0 40px ${styles.headerColor}40`,
          marginBottom: '16px',
        }}
      >
        Welcome to Tangent
      </h1>
      <p style={{ color: '#888', fontSize: '18px' }}>
        Visual Tuner for AI-Generated Code
      </p>
    </div>
  )
}
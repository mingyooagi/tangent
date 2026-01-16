'use client'

import { useTangent } from 'tangent-core'

export function Card() {
  const styles = useTangent('CardComponent', {
    borderRadius: 12,
    padding: 184,
    cardGradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    borderColor: '#333',
    cardShadow: '25px 3px 33px 10px rgba(0, 0, 0, 0.3)',
  })

  return (
    <div
      style={{
        borderRadius: `${styles.borderRadius}px`,
        background: styles.cardGradient,
        border: `1px solid ${styles.borderColor}`,
        padding: `${styles.padding}px`,
        boxShadow: styles.cardShadow,
      }}
    >
      <h3 style={{ color: '#fff', marginBottom: '12px' }}>Feature Card</h3>
      <p style={{ color: '#888', lineHeight: 1.6 }}>
        Adjust the styling of this card using the Tangent control panel.
        Try the new BoxShadow and Gradient editors!
      </p>
    </div>
  )
}
'use client'

import { useTangent } from 'tangent-core'

export function Card() {
  const styles = useTangent('CardComponent', {
    borderRadius: 86,
    backgroundColor: '#7171ad',
    borderColor: '#c96e6e',
    padding: 91,
  })

  return (
    <div
      style={{
        borderRadius: `${styles.borderRadius}px`,
        backgroundColor: styles.backgroundColor,
        border: `1px solid ${styles.borderColor}`,
        padding: `${styles.padding}px`,
      }}
    >
      <h3 style={{ color: '#fff', marginBottom: '12px' }}>Feature Card</h3>
      <p style={{ color: '#888', lineHeight: 1.6 }}>
        Adjust the styling of this card using the Tangent control panel.
        Changes will be saved directly to the source code.
      </p>
    </div>
  )
}
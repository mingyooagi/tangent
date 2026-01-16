"use client";

import { useTangent, TangentRoot } from "tangent-core";

export function Card() {
  const styles = useTangent("CardComponent", {
    borderRadius: 12,
    padding: 24,
    cardGradient: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
    borderColor: "#333",
    cardShadow: "0px 4px 20px 0px rgba(0, 0, 0, 0.3)",
  });

  return (
    <TangentRoot
      tangent={styles}
      style={{
        borderRadius: `${styles.borderRadius}px`,
        background: styles.cardGradient,
        border: `1px solid ${styles.borderColor}`,
        padding: `${styles.padding}px`,
        boxShadow: styles.cardShadow,
      }}
    >
      <h3 style={{ color: "#fff", marginBottom: "12px" }}>Feature Card</h3>
      <p style={{ color: "#888", lineHeight: 1.6 }}>
        Adjust the styling of this card using the Tangent control panel. Try the
        new BoxShadow and Gradient editors!
      </p>
    </TangentRoot>
  );
}

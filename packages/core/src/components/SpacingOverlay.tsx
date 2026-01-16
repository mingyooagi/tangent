import { useEffect, useState, useCallback } from "react";

import { useTangentContext } from "../context/TangentContext";

interface SpacingBox {
  element: HTMLElement;
  rect: DOMRect;
  margin: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
  id?: string;
}

interface SpacingOverlayProps {
  enabled: boolean;
}

export function SpacingOverlay({ enabled }: SpacingOverlayProps) {
  const [hoveredElement, setHoveredElement] = useState<SpacingBox | null>(null);
  const { setHighlightedId } = useTangentContext();

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (
      target.closest("[data-tangent-overlay]") ||
      target.closest("[data-tangent-panel]")
    ) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const styles = window.getComputedStyle(target);

    const tangentId = target
      .closest("[data-tangent-id]")
      ?.getAttribute("data-tangent-id");
    const scaleX = target.offsetWidth > 0 ? rect.width / target.offsetWidth : 1;
    const scaleY =
      target.offsetHeight > 0 ? rect.height / target.offsetHeight : 1;
    const scale = (scaleX + scaleY) / 2;

    const margin = {
      top: (parseFloat(styles.marginTop) || 0) * scale,
      right: (parseFloat(styles.marginRight) || 0) * scale,
      bottom: (parseFloat(styles.marginBottom) || 0) * scale,
      left: (parseFloat(styles.marginLeft) || 0) * scale,
    };

    const padding = {
      top: (parseFloat(styles.paddingTop) || 0) * scale,
      right: (parseFloat(styles.paddingRight) || 0) * scale,
      bottom: (parseFloat(styles.paddingBottom) || 0) * scale,
      left: (parseFloat(styles.paddingLeft) || 0) * scale,
    };

    setHoveredElement({
      element: target,
      rect,
      margin,
      padding,
      id: tangentId || undefined,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredElement(null);
    setHighlightedId(null);
  }, [setHighlightedId]);

  useEffect(() => {
    if (hoveredElement?.id) {
      setHighlightedId(hoveredElement.id);
    } else {
      setHighlightedId(null);
    }
  }, [hoveredElement?.id, setHighlightedId]);
  useEffect(() => {
    if (!enabled) {
      setHoveredElement(null);
      setHighlightedId(null);
      return;
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      setHighlightedId(null);
    };
  }, [enabled, handleMouseMove, handleMouseLeave, setHighlightedId]);

  if (!enabled || !hoveredElement) {
    return null;
  }

  const { rect, margin, padding } = hoveredElement;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Calculate positions for the overlay boxes
  const contentBox = {
    left: rect.left + scrollX + padding.left,
    top: rect.top + scrollY + padding.top,
    width: rect.width - padding.left - padding.right,
    height: rect.height - padding.top - padding.bottom,
  };

  const paddingBox = {
    left: rect.left + scrollX,
    top: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
  };

  const marginBox = {
    left: rect.left + scrollX - margin.left,
    top: rect.top + scrollY - margin.top,
    width: rect.width + margin.left + margin.right,
    height: rect.height + margin.top + margin.bottom,
  };

  const hasMargin = margin.top || margin.right || margin.bottom || margin.left;
  const hasPadding =
    padding.top || padding.right || padding.bottom || padding.left;

  return (
    <div data-tangent-overlay style={styles.container}>
      {/* Margin overlay - orange */}
      {hasMargin && (
        <>
          {/* Top margin */}
          {margin.top > 0 && (
            <div
              style={{
                ...styles.marginBox,
                left: paddingBox.left,
                top: marginBox.top,
                width: paddingBox.width,
                height: margin.top,
              }}
            >
              <span style={styles.label}>{margin.top}</span>
            </div>
          )}
          {/* Right margin */}
          {margin.right > 0 && (
            <div
              style={{
                ...styles.marginBox,
                left: paddingBox.left + paddingBox.width,
                top: paddingBox.top,
                width: margin.right,
                height: paddingBox.height,
              }}
            >
              <span style={styles.label}>{margin.right}</span>
            </div>
          )}
          {/* Bottom margin */}
          {margin.bottom > 0 && (
            <div
              style={{
                ...styles.marginBox,
                left: paddingBox.left,
                top: paddingBox.top + paddingBox.height,
                width: paddingBox.width,
                height: margin.bottom,
              }}
            >
              <span style={styles.label}>{margin.bottom}</span>
            </div>
          )}
          {/* Left margin */}
          {margin.left > 0 && (
            <div
              style={{
                ...styles.marginBox,
                left: marginBox.left,
                top: paddingBox.top,
                width: margin.left,
                height: paddingBox.height,
              }}
            >
              <span style={styles.label}>{margin.left}</span>
            </div>
          )}
        </>
      )}

      {/* Padding overlay - green */}
      {hasPadding && (
        <>
          {/* Top padding */}
          {padding.top > 0 && (
            <div
              style={{
                ...styles.paddingBox,
                left: paddingBox.left,
                top: paddingBox.top,
                width: paddingBox.width,
                height: padding.top,
              }}
            >
              <span style={styles.label}>{padding.top}</span>
            </div>
          )}
          {/* Right padding */}
          {padding.right > 0 && (
            <div
              style={{
                ...styles.paddingBox,
                left: contentBox.left + contentBox.width,
                top: contentBox.top,
                width: padding.right,
                height: contentBox.height,
              }}
            >
              <span style={styles.label}>{padding.right}</span>
            </div>
          )}
          {/* Bottom padding */}
          {padding.bottom > 0 && (
            <div
              style={{
                ...styles.paddingBox,
                left: paddingBox.left,
                top: contentBox.top + contentBox.height,
                width: paddingBox.width,
                height: padding.bottom,
              }}
            >
              <span style={styles.label}>{padding.bottom}</span>
            </div>
          )}
          {/* Left padding */}
          {padding.left > 0 && (
            <div
              style={{
                ...styles.paddingBox,
                left: paddingBox.left,
                top: contentBox.top,
                width: padding.left,
                height: contentBox.height,
              }}
            >
              <span style={styles.label}>{padding.left}</span>
            </div>
          )}
        </>
      )}

      {/* Content box outline - blue */}
      <div
        style={{
          ...styles.contentBox,
          left: contentBox.left,
          top: contentBox.top,
          width: contentBox.width,
          height: contentBox.height,
        }}
      />

      {/* Element info tooltip */}
      <div
        style={{
          ...styles.tooltip,
          left: marginBox.left,
          top: Math.max(marginBox.top - 28, scrollY + 4),
        }}
      >
        {hoveredElement.element.tagName.toLowerCase()}
        {hoveredElement.element.className &&
        typeof hoveredElement.element.className === "string"
          ? `.${hoveredElement.element.className.split(" ")[0]}`
          : ""}
        <span style={styles.dimensions}>
          {" "}
          {Math.round(rect.width)} × {Math.round(rect.height)}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 999998,
  },
  marginBox: {
    position: "absolute",
    backgroundColor: "rgba(255, 165, 0, 0.3)",
    border: "1px dashed rgba(255, 165, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  paddingBox: {
    position: "absolute",
    backgroundColor: "rgba(0, 255, 159, 0.2)",
    border: "1px dashed rgba(0, 255, 159, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  contentBox: {
    position: "absolute",
    border: "1px solid rgba(0, 150, 255, 0.8)",
    boxSizing: "border-box",
    pointerEvents: "none",
  },
  label: {
    fontSize: "10px",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    color: "#fff",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
    fontWeight: 600,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(13, 13, 18, 0.95)",
    border: "1px solid rgba(0, 255, 159, 0.3)",
    borderRadius: "4px",
    padding: "4px 8px",
    fontSize: "11px",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    color: "#00ff9f",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  },
  dimensions: {
    color: "#888",
  },
};

import { useEffect, useMemo, useState } from "react";
import { useTangentContext } from "../context/TangentContext";

interface HighlightBox {
  rect: DOMRect;
  id: string;
}

export function HighlightOverlay() {
  const { highlightedId } = useTangentContext();
  const [box, setBox] = useState<HighlightBox | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [fadeToken, setFadeToken] = useState(0);

  useEffect(() => {
    if (!highlightedId) {
      setIsVisible(false);
      setFadeToken((prev) => prev + 1);
      return;
    }

    const element = document.querySelector(
      `[data-tangent-id="${highlightedId}"]`,
    ) as HTMLElement | null;

    if (!element) {
      setIsVisible(false);
      return;
    }

    const updateRect = () => {
      const rect = element.getBoundingClientRect();
      setBox({ rect, id: highlightedId });
      setIsVisible(true);
    };

    updateRect();

    const resizeObserver = new ResizeObserver(() => updateRect());
    resizeObserver.observe(element);

    const handleScroll = () => updateRect();
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [highlightedId]);

  useEffect(() => {
    if (!box) return;
    const timer = window.setTimeout(() => {
      setBox(null);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [fadeToken]);

  const style = useMemo(() => {
    if (!box) return undefined;
    return {
      ...styles.box,
      left: box.rect.left + window.scrollX,
      top: box.rect.top + window.scrollY,
      width: box.rect.width,
      height: box.rect.height,
      opacity: isVisible ? 1 : 0,
    } as React.CSSProperties;
  }, [box, isVisible]);

  if (!box) return null;

  return (
    <div data-tangent-overlay style={styles.container}>
      <div style={style} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 999997,
  },
  box: {
    position: "absolute",
    border: "1px solid rgba(0, 255, 159, 0.7)",
    boxShadow: "0 0 12px rgba(0, 255, 159, 0.3)",
    borderRadius: "6px",
    transition: "opacity 150ms ease",
  },
};

import { useEffect, useState, useCallback, useRef } from "react";
import { useTangentContext } from "../context/TangentContext";
import {
  emitTuningEvent,
  detectValueType,
  type SuggestedProperty,
  type DiscoveryInspectedPayload,
} from "../schema";

interface DiscoveryOverlayProps {
  enabled: boolean;
}

interface InspectedElement {
  element: HTMLElement;
  rect: DOMRect;
  tagName: string;
  cssClasses: string;
  elementPath: string;
  computedStyles: Record<string, string>;
  suggestedProperties: SuggestedProperty[];
  reactComponents?: string;
}

// CSS properties relevant for tuning
const TUNABLE_CSS_PROPERTIES: Array<{
  prop: string;
  type: "number" | "color" | "string";
  label: string;
}> = [
  { prop: "padding", type: "number", label: "padding" },
  { prop: "paddingTop", type: "number", label: "paddingTop" },
  { prop: "paddingRight", type: "number", label: "paddingRight" },
  { prop: "paddingBottom", type: "number", label: "paddingBottom" },
  { prop: "paddingLeft", type: "number", label: "paddingLeft" },
  { prop: "margin", type: "number", label: "margin" },
  { prop: "marginTop", type: "number", label: "marginTop" },
  { prop: "marginRight", type: "number", label: "marginRight" },
  { prop: "marginBottom", type: "number", label: "marginBottom" },
  { prop: "marginLeft", type: "number", label: "marginLeft" },
  { prop: "fontSize", type: "number", label: "fontSize" },
  { prop: "lineHeight", type: "number", label: "lineHeight" },
  { prop: "letterSpacing", type: "number", label: "letterSpacing" },
  { prop: "borderRadius", type: "number", label: "borderRadius" },
  { prop: "gap", type: "number", label: "gap" },
  { prop: "width", type: "number", label: "width" },
  { prop: "height", type: "number", label: "height" },
  { prop: "opacity", type: "number", label: "opacity" },
  { prop: "color", type: "color", label: "color" },
  { prop: "backgroundColor", type: "color", label: "backgroundColor" },
  { prop: "borderColor", type: "color", label: "borderColor" },
  { prop: "boxShadow", type: "string", label: "boxShadow" },
  { prop: "borderWidth", type: "number", label: "borderWidth" },
];

function getElementPath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === "string") {
      const cls = current.className
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .join(".");
      if (cls) selector += `.${cls}`;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  parts.unshift("body");
  return parts.join(" > ");
}

function getReactComponentTree(el: HTMLElement): string | undefined {
  const components: string[] = [];
  let fiber: any = null;

  // Try to find React fiber
  for (const key of Object.keys(el)) {
    if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
      fiber = (el as any)[key];
      break;
    }
  }

  if (!fiber) return undefined;

  let current = fiber;
  let depth = 0;
  while (current && depth < 15) {
    if (current.type && typeof current.type === "function") {
      const name = current.type.displayName || current.type.name;
      if (name && !name.startsWith("_") && name[0] === name[0].toUpperCase()) {
        components.unshift(name);
      }
    }
    current = current.return;
    depth++;
  }

  return components.length > 0 ? components.join(" > ") : undefined;
}

function extractTunableProperties(
  el: HTMLElement,
): { computedStyles: Record<string, string>; suggestions: SuggestedProperty[] } {
  const computed = window.getComputedStyle(el);
  const computedStyles: Record<string, string> = {};
  const suggestions: SuggestedProperty[] = [];

  for (const entry of TUNABLE_CSS_PROPERTIES) {
    const rawValue = computed.getPropertyValue(
      entry.prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
    );
    if (!rawValue || rawValue === "none" || rawValue === "normal" || rawValue === "auto") continue;

    computedStyles[entry.prop] = rawValue;

    if (entry.type === "number") {
      const num = parseFloat(rawValue);
      if (!isNaN(num) && num !== 0) {
        suggestions.push({
          key: entry.label,
          value: num,
          type: "number",
          cssProperty: entry.prop,
        });
      }
      // Special case for opacity (always suggest)
      if (entry.prop === "opacity") {
        suggestions.push({
          key: entry.label,
          value: num,
          type: "number",
          cssProperty: entry.prop,
        });
      }
    } else if (entry.type === "color") {
      if (rawValue !== "rgba(0, 0, 0, 0)" && rawValue !== "transparent") {
        suggestions.push({
          key: entry.label,
          value: rawValue,
          type: "color",
          cssProperty: entry.prop,
        });
      }
    } else {
      if (entry.prop === "boxShadow" && rawValue !== "none") {
        suggestions.push({
          key: entry.label,
          value: rawValue,
          type: "boxshadow",
          cssProperty: entry.prop,
        });
      }
    }
  }

  return { computedStyles, suggestions };
}

export function DiscoveryOverlay({ enabled }: DiscoveryOverlayProps) {
  const [hoveredElement, setHoveredElement] = useState<InspectedElement | null>(null);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const { setDiscoveryMode } = useTangentContext();
  const overlayRef = useRef<HTMLDivElement>(null);

  const inspectElement = useCallback((target: HTMLElement): InspectedElement => {
    const rect = target.getBoundingClientRect();
    const { computedStyles, suggestions } = extractTunableProperties(target);
    const reactComponents = getReactComponentTree(target);

    return {
      element: target,
      rect,
      tagName: target.tagName.toLowerCase(),
      cssClasses: typeof target.className === "string" ? target.className : "",
      elementPath: getElementPath(target),
      computedStyles,
      suggestedProperties: suggestions,
      reactComponents,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (inspectedElement) return; // Don't hover-update when inspected

      const target = e.target as HTMLElement;
      if (
        target.closest("[data-tangent-overlay]") ||
        target.closest("[data-tangent-panel]") ||
        target.closest("[data-tangent-discovery]")
      ) {
        return;
      }

      setHoveredElement(inspectElement(target));
    },
    [inspectedElement, inspectElement],
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-tangent-overlay]") ||
        target.closest("[data-tangent-panel]") ||
        target.closest("[data-tangent-discovery]")
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const inspected = inspectElement(target);
      setInspectedElement(inspected);
      setHoveredElement(null);

      // Emit discovery event
      const payload: DiscoveryInspectedPayload = {
        elementPath: inspected.elementPath,
        element: inspected.tagName,
        cssClasses: inspected.cssClasses,
        computedStyles: inspected.computedStyles,
        boundingBox: {
          x: inspected.rect.x,
          y: inspected.rect.y,
          width: inspected.rect.width,
          height: inspected.rect.height,
        },
        reactComponents: inspected.reactComponents,
        suggestedProperties: inspected.suggestedProperties,
      };
      emitTuningEvent("discovery.inspected", payload);
    },
    [inspectElement],
  );

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (inspectedElement) {
          setInspectedElement(null);
        } else {
          setDiscoveryMode(false);
        }
      }
    },
    [inspectedElement, setDiscoveryMode],
  );

  useEffect(() => {
    if (!enabled) {
      setHoveredElement(null);
      setInspectedElement(null);
      return;
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleEscape);

    // Change cursor
    document.body.style.cursor = "crosshair";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.cursor = "";
    };
  }, [enabled, handleMouseMove, handleClick, handleEscape]);

  if (!enabled) return null;

  const activeElement = inspectedElement || hoveredElement;
  if (!activeElement) {
    return (
      <div data-tangent-discovery style={styles.banner}>
        <span style={styles.bannerIcon}>◎</span>
        <span>Discovery Mode — Click any element to inspect</span>
        <span style={styles.bannerHint}>ESC to exit</span>
      </div>
    );
  }

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const { rect } = activeElement;

  return (
    <>
      {/* Top banner */}
      <div data-tangent-discovery style={styles.banner}>
        <span style={styles.bannerIcon}>◎</span>
        <span>Discovery Mode — {inspectedElement ? "Inspecting element" : "Hover & click"}</span>
        <span style={styles.bannerHint}>ESC to {inspectedElement ? "deselect" : "exit"}</span>
      </div>

      {/* Hover / selection box */}
      <div data-tangent-overlay ref={overlayRef} style={styles.overlayContainer}>
        <div
          style={{
            ...styles.highlightBox,
            left: rect.left + scrollX,
            top: rect.top + scrollY,
            width: rect.width,
            height: rect.height,
            borderColor: inspectedElement
              ? "rgba(0, 212, 255, 0.9)"
              : "rgba(0, 212, 255, 0.5)",
            boxShadow: inspectedElement
              ? "0 0 20px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.1)"
              : "0 0 12px rgba(0, 212, 255, 0.2)",
          }}
        />

        {/* Element info tooltip */}
        <div
          style={{
            ...styles.tooltip,
            left: rect.left + scrollX,
            top: Math.max(rect.top + scrollY - 32, scrollY + 40),
          }}
        >
          <span style={styles.tooltipTag}>{activeElement.tagName}</span>
          {activeElement.cssClasses && (
            <span style={styles.tooltipClass}>
              .{activeElement.cssClasses.split(" ")[0]}
            </span>
          )}
          <span style={styles.tooltipDim}>
            {Math.round(rect.width)} x {Math.round(rect.height)}
          </span>
        </div>

        {/* Inspected element detail panel */}
        {inspectedElement && (
          <div
            data-tangent-discovery
            style={{
              ...styles.detailPanel,
              left: Math.min(
                rect.right + scrollX + 12,
                window.innerWidth + scrollX - 320,
              ),
              top: rect.top + scrollY,
            }}
          >
            <div style={styles.detailHeader}>
              <span style={styles.detailTitle}>Element Details</span>
              <button
                style={styles.detailClose}
                onClick={() => setInspectedElement(null)}
              >
                ✕
              </button>
            </div>

            {/* Selector path */}
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Selector</div>
              <div style={styles.detailCode}>{inspectedElement.elementPath}</div>
            </div>

            {/* React components */}
            {inspectedElement.reactComponents && (
              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>React Components</div>
                <div style={styles.detailCode}>
                  {inspectedElement.reactComponents}
                </div>
              </div>
            )}

            {/* Suggested tunable properties */}
            {inspectedElement.suggestedProperties.length > 0 && (
              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>
                  Tunable Properties ({inspectedElement.suggestedProperties.length})
                </div>
                <div style={styles.suggestList}>
                  {inspectedElement.suggestedProperties.slice(0, 12).map((prop, i) => (
                    <div key={i} style={styles.suggestItem}>
                      <span style={styles.suggestKey}>{prop.key}</span>
                      <span style={styles.suggestValue}>
                        {typeof prop.value === "number"
                          ? `${prop.value}px`
                          : String(prop.value).slice(0, 24)}
                      </span>
                      <span style={styles.suggestType}>{prop.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage hint */}
            <div style={styles.detailHint}>
              Add these to <code style={styles.hintCode}>useTangent()</code> to make them tunable
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    borderBottom: "1px solid rgba(0, 212, 255, 0.3)",
    backdropFilter: "blur(10px)",
    color: "#00d4ff",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "12px",
    fontWeight: 600,
    zIndex: 999999,
    pointerEvents: "none",
  },
  bannerIcon: {
    fontSize: "14px",
    textShadow: "0 0 8px rgba(0, 212, 255, 0.8)",
  },
  bannerHint: {
    fontSize: "10px",
    color: "rgba(0, 212, 255, 0.6)",
    marginLeft: "8px",
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 999998,
  },
  highlightBox: {
    position: "absolute",
    border: "2px solid rgba(0, 212, 255, 0.5)",
    borderRadius: "4px",
    transition: "all 100ms ease",
    boxSizing: "border-box",
  },
  tooltip: {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    backgroundColor: "rgba(13, 13, 18, 0.95)",
    border: "1px solid rgba(0, 212, 255, 0.4)",
    borderRadius: "4px",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "11px",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  },
  tooltipTag: {
    color: "#00d4ff",
    fontWeight: 600,
  },
  tooltipClass: {
    color: "#00ff9f",
  },
  tooltipDim: {
    color: "#666",
    fontSize: "10px",
  },
  detailPanel: {
    position: "absolute",
    width: "300px",
    maxHeight: "420px",
    overflowY: "auto",
    backgroundColor: "rgba(13, 13, 18, 0.97)",
    border: "1px solid rgba(0, 212, 255, 0.3)",
    borderRadius: "10px",
    boxShadow:
      "0 0 30px rgba(0, 212, 255, 0.1), 0 10px 40px rgba(0, 0, 0, 0.5)",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "11px",
    color: "#e0e0e0",
    pointerEvents: "auto",
    backdropFilter: "blur(10px)",
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(0, 212, 255, 0.2)",
    background:
      "linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, transparent 100%)",
  },
  detailTitle: {
    fontWeight: 700,
    fontSize: "11px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    background: "linear-gradient(90deg, #00d4ff, #00ff9f)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  detailClose: {
    background: "transparent",
    border: "none",
    color: "#666",
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "12px",
  },
  detailSection: {
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  detailLabel: {
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#888",
    marginBottom: "4px",
  },
  detailCode: {
    fontSize: "10px",
    color: "#00d4ff",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: "4px 8px",
    borderRadius: "4px",
    wordBreak: "break-all",
    lineHeight: 1.5,
  },
  suggestList: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  suggestItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px",
    backgroundColor: "rgba(0, 255, 159, 0.05)",
    borderRadius: "4px",
    border: "1px solid rgba(0, 255, 159, 0.1)",
  },
  suggestKey: {
    flex: 1,
    color: "#00ff9f",
    fontWeight: 600,
    fontSize: "10px",
  },
  suggestValue: {
    color: "#888",
    fontSize: "10px",
    maxWidth: "80px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  suggestType: {
    fontSize: "8px",
    color: "#555",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: "1px 4px",
    borderRadius: "3px",
    textTransform: "uppercase",
  },
  detailHint: {
    padding: "8px 12px",
    fontSize: "10px",
    color: "#666",
    textAlign: "center",
  },
  hintCode: {
    color: "#00ff9f",
    backgroundColor: "rgba(0, 255, 159, 0.1)",
    padding: "1px 4px",
    borderRadius: "3px",
    fontFamily: "inherit",
  },
};

/**
 * Tangent Tuning Schema v1.0
 *
 * A portable format for structured UI tuning events.
 * Enables MCP servers, webhooks, and third-party tools to
 * consume and produce Tangent tuning data.
 */

// ─── Value Types ───────────────────────────────────────────

export type TuningValueType = "number" | "string" | "boolean" | "color" | "gradient" | "boxshadow" | "easing";

export interface TuningProperty {
  key: string;
  value: number | string | boolean;
  type: TuningValueType;
  /** Value as it exists in the source file */
  sourceValue?: number | string | boolean;
}

// ─── Registration (component state snapshot) ───────────────

export interface TuningRegistration {
  /** Unique component ID (from useTangent) */
  id: string;
  /** Source file path */
  filePath: string;
  /** All tunable properties */
  properties: TuningProperty[];
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** React component name if available */
  reactComponent?: string;
}

// ─── Events ────────────────────────────────────────────────

export type TuningEventType =
  | "registration.added"
  | "registration.removed"
  | "value.changed"
  | "value.saved"
  | "value.reset"
  | "discovery.inspected";

export type TuningEventSource = "human" | "agent";

export interface TuningEvent {
  type: TuningEventType;
  timestamp: number;
  /** Monotonic sequence number for ordering */
  sequence: number;
  /** Who initiated this event */
  source: TuningEventSource;
  payload: TuningEventPayload;
}

export interface ValueChangedPayload {
  id: string;
  filePath: string;
  key: string;
  oldValue: number | string | boolean;
  newValue: number | string | boolean;
  valueType: TuningValueType;
}

export interface ValueSavedPayload {
  id: string;
  filePath: string;
  key: string;
  value: number | string | boolean;
}

export interface ValueResetPayload {
  id: string;
  filePath: string;
  keys: string[];
}

export interface RegistrationPayload {
  id: string;
  filePath: string;
  properties: TuningProperty[];
}

export interface DiscoveryInspectedPayload {
  /** CSS selector path to the element */
  elementPath: string;
  /** Tag name */
  element: string;
  /** CSS classes */
  cssClasses: string;
  /** Computed CSS properties (key subset relevant for tuning) */
  computedStyles: Record<string, string>;
  /** Bounding box */
  boundingBox: { x: number; y: number; width: number; height: number };
  /** React component hierarchy (if detectable) */
  reactComponents?: string;
  /** Suggested tunable properties */
  suggestedProperties: SuggestedProperty[];
}

export interface SuggestedProperty {
  key: string;
  value: string | number;
  type: TuningValueType;
  cssProperty: string;
}

export type TuningEventPayload =
  | ValueChangedPayload
  | ValueSavedPayload
  | ValueResetPayload
  | RegistrationPayload
  | DiscoveryInspectedPayload;

// ─── Session ───────────────────────────────────────────────

export interface TuningSession {
  sessionId: string;
  startedAt: number;
  /** Page URL */
  url: string;
  registrations: TuningRegistration[];
}

// ─── Agent suggestion (for MCP bidirectional communication) ─

export interface AgentSuggestion {
  id: string;
  targetId: string;
  key: string;
  suggestedValue: number | string | boolean;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

// ─── Event Bus ─────────────────────────────────────────────

export type TuningEventListener = (event: TuningEvent) => void;

let sequence = 0;

const listeners = new Set<TuningEventListener>();

export function emitTuningEvent(type: TuningEventType, payload: TuningEventPayload, source: TuningEventSource = "human"): TuningEvent {
  const event: TuningEvent = {
    type,
    timestamp: Date.now(),
    sequence: ++sequence,
    source,
    payload,
  };
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (e) {
      console.error("[tangent] Event listener error:", e);
    }
  });
  return event;
}

export function onTuningEvent(listener: TuningEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─── Helpers ───────────────────────────────────────────────

export function detectValueType(value: unknown, key: string): TuningValueType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") {
    const keyLower = key.toLowerCase();
    if (keyLower.includes("shadow")) return "boxshadow";
    if (keyLower.includes("gradient")) return "gradient";
    if (
      keyLower.includes("easing") ||
      keyLower.includes("timing") ||
      keyLower.includes("transition")
    ) {
      if (value.includes("cubic-bezier") || ["linear", "ease", "ease-in", "ease-out", "ease-in-out"].includes(value))
        return "easing";
    }
    if (value.includes("linear-gradient") || value.includes("radial-gradient"))
      return "gradient";
    if (/^(inset\s+)?-?\d+px\s+-?\d+px\s+\d+px/.test(value)) return "boxshadow";
    if (
      value.startsWith("#") ||
      value.startsWith("rgb") ||
      value.startsWith("hsl")
    )
      return "color";
    if (value.includes("cubic-bezier") || ["linear", "ease", "ease-in", "ease-out", "ease-in-out"].includes(value))
      return "easing";
    return "string";
  }
  return "string";
}

/** Serialize a TuningSession to markdown (for clipboard / chat pasting) */
export function sessionToMarkdown(session: TuningSession): string {
  const lines: string[] = [
    `# Tangent Tuning Session`,
    ``,
    `**URL:** ${session.url}`,
    `**Started:** ${new Date(session.startedAt).toISOString()}`,
    `**Components:** ${session.registrations.length}`,
    ``,
  ];

  for (const reg of session.registrations) {
    lines.push(`## ${reg.id}`);
    lines.push(`**File:** \`${reg.filePath}\``);
    if (reg.reactComponent) {
      lines.push(`**Component:** ${reg.reactComponent}`);
    }
    lines.push(``);
    lines.push(`| Property | Value | Type | Modified |`);
    lines.push(`|----------|-------|------|----------|`);
    for (const prop of reg.properties) {
      const modified = prop.sourceValue !== undefined && prop.sourceValue !== prop.value;
      lines.push(
        `| ${prop.key} | \`${prop.value}\` | ${prop.type} | ${modified ? `~~\`${prop.sourceValue}\`~~ -> \`${prop.value}\`` : "-"} |`,
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}

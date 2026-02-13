import { useState, useEffect, useCallback } from "react";
import { useTangentContext } from "../context/TangentContext";
import type { TangentValue } from "../types";

interface Suggestion {
  id: string;
  targetId: string;
  key: string;
  suggestedValue: TangentValue;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

export function SuggestionsPanel() {
  const { endpoint, updateValue } = useTangentContext();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Poll for pending suggestions
  useEffect(() => {
    const suggestionsUrl = endpoint.replace(/\/update$/, "/suggestions?status=pending");

    const poll = () => {
      fetch(suggestionsUrl)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setSuggestions(data);
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [endpoint]);

  const handleAccept = useCallback(
    async (suggestion: Suggestion) => {
      // Apply the value
      updateValue(suggestion.targetId, suggestion.key, suggestion.suggestedValue);

      // PATCH status to accepted
      const patchUrl = endpoint.replace(/\/update$/, `/suggestions/${encodeURIComponent(suggestion.id)}`);
      await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }).catch(() => {});

      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    },
    [endpoint, updateValue],
  );

  const handleReject = useCallback(
    async (suggestion: Suggestion) => {
      const patchUrl = endpoint.replace(/\/update$/, `/suggestions/${encodeURIComponent(suggestion.id)}`);
      await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      }).catch(() => {});

      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    },
    [endpoint],
  );

  if (suggestions.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>AI</span>
        <span style={styles.headerText}>
          Agent Suggestions ({suggestions.length})
        </span>
      </div>
      {suggestions.map((s) => (
        <div key={s.id} style={styles.item}>
          <div style={styles.itemTarget}>
            {s.targetId}.{s.key}
          </div>
          <div style={styles.itemValue}>
            {JSON.stringify(s.suggestedValue)}
          </div>
          <div style={styles.itemReason}>{s.reason}</div>
          <div style={styles.itemActions}>
            <button
              style={styles.acceptBtn}
              onClick={() => handleAccept(s)}
              title="Accept suggestion"
            >
              Accept
            </button>
            <button
              style={styles.rejectBtn}
              onClick={() => handleReject(s)}
              title="Reject suggestion"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid rgba(138, 43, 226, 0.2)",
    padding: "0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background:
      "linear-gradient(180deg, rgba(138, 43, 226, 0.08) 0%, transparent 100%)",
  },
  headerIcon: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#8a2be2",
    backgroundColor: "rgba(138, 43, 226, 0.2)",
    padding: "2px 5px",
    borderRadius: "3px",
    letterSpacing: "0.5px",
  },
  headerText: {
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    color: "#8a2be2",
  },
  item: {
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  },
  itemTarget: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#8a2be2",
    marginBottom: "2px",
  },
  itemValue: {
    fontSize: "11px",
    color: "#e0e0e0",
    fontFamily: "inherit",
    marginBottom: "4px",
  },
  itemReason: {
    fontSize: "10px",
    color: "#888",
    lineHeight: 1.4,
    marginBottom: "6px",
  },
  itemActions: {
    display: "flex",
    gap: "6px",
  },
  acceptBtn: {
    background: "rgba(0, 255, 159, 0.15)",
    border: "1px solid rgba(0, 255, 159, 0.3)",
    borderRadius: "4px",
    color: "#00ff9f",
    cursor: "pointer",
    padding: "3px 10px",
    fontSize: "10px",
    fontFamily: "inherit",
    fontWeight: 600,
    transition: "all 0.15s",
  },
  rejectBtn: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "4px",
    color: "#666",
    cursor: "pointer",
    padding: "3px 10px",
    fontSize: "10px",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
};

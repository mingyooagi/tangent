import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  TangentContextValue,
  TangentRegistration,
  TangentValue,
  HistoryState,
  ViewportSize,
  UnsavedChange,
} from "../types";
import { ControlPanel } from "../components/ControlPanel";
import { SpacingOverlay } from "../components/SpacingOverlay";
import { HighlightOverlay } from "../components/HighlightOverlay";
import { ResponsivePreview } from "../components/ResponsivePreview";
import { DiscoveryOverlay } from "../components/DiscoveryOverlay";
import { getStoredConfig, setStoredConfig, updateStoredConfig } from "../store";
import {
  pushHistory,
  undo as undoHistory,
  redo as redoHistory,
  getHistoryState,
} from "../history";
import {
  emitTuningEvent,
  onTuningEvent,
  detectValueType,
} from "../schema";

const isDev = process.env.NODE_ENV === "development";

export const TangentContext = createContext<TangentContextValue | null>(null);

interface TangentProviderProps {
  children: ReactNode;
  endpoint?: string;
}

const noopFn = () => {};
const noopAsync = async () => {};

const prodContextValue: TangentContextValue = {
  registrations: new Map(),
  register: noopFn,
  unregister: noopFn,
  updateValue: noopFn,
  isOpen: false,
  setIsOpen: noopFn,
  showCode: false,
  setShowCode: noopFn,
  showSpacing: false,
  setShowSpacing: noopFn,
  viewport: "full",
  setViewport: noopFn,
  endpoint: "",
  historyState: { canUndo: false, canRedo: false },
  undo: noopFn,
  redo: noopFn,
  unsavedChanges: [],
  saveAll: noopAsync,
  saveSection: noopAsync,
  resetSection: noopFn,
  resetAll: noopFn,
  isSaving: false,
  highlightedId: null,
  setHighlightedId: noopFn,
  discoveryMode: false,
  setDiscoveryMode: noopFn,
};

export function TangentProvider({
  children,
  endpoint = "/__tangent/update",
}: TangentProviderProps) {
  if (!isDev) {
    return <>{children}</>;
  }

  return (
    <TangentProviderDev endpoint={endpoint}>{children}</TangentProviderDev>
  );
}

function TangentProviderDev({ children, endpoint }: TangentProviderProps) {
  const [registrations, setRegistrations] = useState<
    Map<string, TangentRegistration>
  >(new Map());
  const [isOpen, setIsOpen] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [showSpacing, setShowSpacing] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>("full");
  const [historyState, setHistoryState] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  const updateHistoryState = useCallback(() => {
    const state = getHistoryState();
    setHistoryState({ canUndo: state.canUndo, canRedo: state.canRedo });
  }, []);

  const register = useCallback((registration: TangentRegistration) => {
    const storedConfig = getStoredConfig(registration.id);

    if (!storedConfig) {
      setStoredConfig(registration.id, registration.originalConfig);
    }

    setRegistrations((prev) => {
      const next = new Map(prev);
      next.set(registration.id, {
        ...registration,
        currentConfig: storedConfig ?? { ...registration.originalConfig },
        sourceConfig: { ...registration.originalConfig },
      });
      return next;
    });

    // Emit registration event
    const config = storedConfig ?? registration.originalConfig;
    emitTuningEvent("registration.added", {
      id: registration.id,
      filePath: registration.filePath,
      properties: Object.entries(config).map(([key, value]) => ({
        key,
        value,
        type: detectValueType(value, key),
        sourceValue: registration.originalConfig[key],
      })),
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setRegistrations((prev) => {
      const reg = prev.get(id);
      if (reg) {
        emitTuningEvent("registration.removed", {
          id: reg.id,
          filePath: reg.filePath,
          properties: Object.entries(reg.currentConfig).map(([key, value]) => ({
            key,
            value,
            type: detectValueType(value, key),
          })),
        });
      }
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateValue = useCallback(
    (id: string, key: string, value: TangentValue, skipHistory = false) => {
      const registration = registrations.get(id);
      const oldValue = registration?.currentConfig[key];

      if (!skipHistory && oldValue !== undefined && oldValue !== value) {
        pushHistory(id, key, oldValue, value);
        updateHistoryState();
      }

      updateStoredConfig(id, key, value);

      setRegistrations((prev) => {
        const next = new Map(prev);
        const reg = next.get(id);
        if (reg) {
          const updated = {
            ...reg,
            currentConfig: { ...reg.currentConfig, [key]: value },
          };
          next.set(id, updated);
          reg.onUpdate(key, value);
        }
        return next;
      });

      // Emit value changed event
      if (registration && oldValue !== value) {
        emitTuningEvent("value.changed", {
          id,
          filePath: registration.filePath,
          key,
          oldValue: oldValue as string | number | boolean,
          newValue: value,
          valueType: detectValueType(value, key),
        });
      }
    },
    [registrations, updateHistoryState],
  );

  // Calculate unsaved changes
  const unsavedChanges: UnsavedChange[] = [];
  registrations.forEach((reg, id) => {
    Object.keys(reg.currentConfig).forEach((key) => {
      const currentValue = reg.currentConfig[key];
      const sourceValue = reg.sourceConfig[key];
      if (currentValue !== sourceValue) {
        unsavedChanges.push({
          id,
          key,
          oldValue: sourceValue,
          newValue: currentValue,
        });
      }
    });
  });

  // Save all changes to source files
  const saveAll = useCallback(async () => {
    if (isSaving || unsavedChanges.length === 0) return;

    setIsSaving(true);
    try {
      for (const change of unsavedChanges) {
        const reg = registrations.get(change.id);
        if (reg) {
          await reg.onSave(change.key, change.newValue);
          // Emit save event per key
          emitTuningEvent("value.saved", {
            id: change.id,
            filePath: reg.filePath,
            key: change.key,
            value: change.newValue,
          });
        }
      }

      // Update sourceConfig to match currentConfig
      setRegistrations((prev) => {
        const next = new Map(prev);
        next.forEach((reg, id) => {
          next.set(id, {
            ...reg,
            sourceConfig: { ...reg.currentConfig },
          });
        });
        return next;
      });
    } catch (error) {
      console.error("[tangent] Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, unsavedChanges, registrations]);

  // Save a single section
  const saveSection = useCallback(
    async (id: string) => {
      const reg = registrations.get(id);
      if (!reg || isSaving) return;

      setIsSaving(true);
      try {
        const sectionChanges = unsavedChanges.filter((c) => c.id === id);
        for (const change of sectionChanges) {
          await reg.onSave(change.key, change.newValue);
        }

        // Update sourceConfig for this section
        setRegistrations((prev) => {
          const next = new Map(prev);
          const r = next.get(id);
          if (r) {
            next.set(id, {
              ...r,
              sourceConfig: { ...r.currentConfig },
            });
          }
          return next;
        });
      } catch (error) {
        console.error("[tangent] Save section failed:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [registrations, isSaving, unsavedChanges],
  );

  // Reset a section to source values
  const resetSection = useCallback(
    (id: string) => {
      const reg = registrations.get(id);
      if (!reg) return;

      // Reset stored config
      setStoredConfig(id, reg.sourceConfig);

      // Update state
      setRegistrations((prev) => {
        const next = new Map(prev);
        const r = next.get(id);
        if (r) {
          next.set(id, {
            ...r,
            currentConfig: { ...r.sourceConfig },
          });
          // Notify component of reset
          Object.keys(r.sourceConfig).forEach((key) => {
            r.onUpdate(key, r.sourceConfig[key]);
          });
        }
        return next;
      });

      // Emit reset event
      emitTuningEvent("value.reset", {
        id,
        filePath: reg.filePath,
        keys: Object.keys(reg.sourceConfig),
      });
    },
    [registrations],
  );

  // Reset all sections
  const resetAll = useCallback(() => {
    registrations.forEach((_, id) => {
      resetSection(id);
    });
  }, [registrations, resetSection]);

  const undo = useCallback(() => {
    const entry = undoHistory();
    if (entry) {
      updateStoredConfig(entry.id, entry.key, entry.oldValue);
      setRegistrations((prev) => {
        const next = new Map(prev);
        const reg = next.get(entry.id);
        if (reg) {
          const updated = {
            ...reg,
            currentConfig: {
              ...reg.currentConfig,
              [entry.key]: entry.oldValue,
            },
          };
          next.set(entry.id, updated);
          reg.onUpdate(entry.key, entry.oldValue);
        }
        return next;
      });
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const redo = useCallback(() => {
    const entry = redoHistory();
    if (entry) {
      updateStoredConfig(entry.id, entry.key, entry.newValue);
      setRegistrations((prev) => {
        const next = new Map(prev);
        const reg = next.get(entry.id);
        if (reg) {
          const updated = {
            ...reg,
            currentConfig: {
              ...reg.currentConfig,
              [entry.key]: entry.newValue,
            },
          };
          next.set(entry.id, updated);
          reg.onUpdate(entry.key, entry.newValue);
        }
        return next;
      });
      updateHistoryState();
    }
  }, [updateHistoryState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "t" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "s" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setShowSpacing((prev) => !prev);
      }
      // Cmd+S to save all
      if (e.key === "s" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        saveAll();
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Cmd+Shift+D to toggle discovery mode
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setDiscoveryMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, saveAll]);

  // ─── Sync registrations to dev server (for MCP) ────────
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Debounced sync of registration state to the server
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(() => {
      const syncData = Array.from(registrations.entries()).map(([id, reg]) => ({
        id,
        filePath: reg.filePath,
        properties: Object.entries(reg.currentConfig).map(([key, value]) => ({
          key,
          value,
          type: detectValueType(value, key),
          sourceValue: reg.sourceConfig[key],
        })),
        hasUnsavedChanges: Object.keys(reg.currentConfig).some(
          (k) => reg.currentConfig[k] !== reg.sourceConfig[k],
        ),
      }));

      // Derive sync endpoint from the update endpoint
      const syncEndpoint = endpoint!.replace(/\/update$/, "/sync");
      fetch(syncEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrations: syncData }),
      }).catch(() => {
        // Silently fail — MCP server may not be running
      });
    }, 300);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [registrations, unsavedChanges, endpoint]);

  // ─── Forward schema events to dev server (for MCP SSE) ─
  useEffect(() => {
    const eventsEndpoint = endpoint!.replace(/\/update$/, "/events");
    const unsubscribe = onTuningEvent((event) => {
      fetch(eventsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently fail
      });
    });
    return unsubscribe;
  }, [endpoint]);

  const contextValue: TangentContextValue = {
    registrations,
    register,
    unregister,
    updateValue,
    isOpen,
    setIsOpen,
    showCode,
    setShowCode,
    showSpacing,
    setShowSpacing,
    viewport,
    setViewport,
    endpoint: endpoint!,
    historyState,
    undo,
    redo,
    unsavedChanges,
    saveAll,
    saveSection,
    resetSection,
    resetAll,
    isSaving,
    highlightedId,
    setHighlightedId,
    discoveryMode,
    setDiscoveryMode,
  };

  return (
    <TangentContext.Provider value={contextValue}>
      <ResponsivePreview
        enabled={viewport !== "full"}
        viewport={viewport}
        onViewportChange={setViewport}
      >
        {children}
      </ResponsivePreview>
      {isOpen && registrations.size > 0 && <ControlPanel />}
      <HighlightOverlay />
      <SpacingOverlay enabled={showSpacing} />
      <DiscoveryOverlay enabled={discoveryMode} />
    </TangentContext.Provider>
  );
}

export function useTangentContext(): TangentContextValue {
  const context = useContext(TangentContext);

  if (!isDev) {
    return prodContextValue;
  }

  if (!context) {
    throw new Error("useTangentContext must be used within a TangentProvider");
  }
  return context;
}

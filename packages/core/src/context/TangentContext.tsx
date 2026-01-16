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
import { getStoredConfig, setStoredConfig, updateStoredConfig } from "../store";
import {
  pushHistory,
  undo as undoHistory,
  redo as redoHistory,
  getHistoryState,
} from "../history";

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
        sourceConfig: { ...registration.originalConfig }, // Track what's in source
      });
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setRegistrations((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateValue = useCallback(
    (id: string, key: string, value: TangentValue, skipHistory = false) => {
      const registration = registrations.get(id);
      const oldValue = registration?.currentConfig[key];

      if (!skipHistory && oldValue !== value) {
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
              [entry.key]: entry.oldValue as TangentValue,
            },
          };
          next.set(entry.id, updated);
          reg.onUpdate(entry.key, entry.oldValue as TangentValue);
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
              [entry.key]: entry.newValue as TangentValue,
            },
          };
          next.set(entry.id, updated);
          reg.onUpdate(entry.key, entry.newValue as TangentValue);
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, saveAll]);

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

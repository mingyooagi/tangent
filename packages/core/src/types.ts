export type TangentValue = number | string | boolean;

export interface TangentConfig {
  [key: string]: TangentValue;
}

export interface TangentControls<T extends TangentConfig> {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
}

export interface TangentRegistration {
  id: string;
  filePath: string;
  originalConfig: TangentConfig;
  currentConfig: TangentConfig;
  sourceConfig: TangentConfig; // What's actually in the source file
  onUpdate: (key: string, value: TangentValue) => void;
  onSave: (key: string, value: TangentValue) => Promise<void>;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export type ViewportSize = "mobile" | "tablet" | "desktop" | "full";

export interface UnsavedChange {
  id: string;
  key: string;
  oldValue: TangentValue;
  newValue: TangentValue;
}

export interface TangentContextValue {
  registrations: Map<string, TangentRegistration>;
  register: (registration: TangentRegistration) => void;
  unregister: (id: string) => void;
  updateValue: (id: string, key: string, value: TangentValue) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  showCode: boolean;
  setShowCode: (show: boolean) => void;
  showSpacing: boolean;
  setShowSpacing: (show: boolean) => void;
  viewport: ViewportSize;
  setViewport: (viewport: ViewportSize) => void;
  endpoint: string;
  historyState: HistoryState;
  undo: () => void;
  redo: () => void;
  // Save functionality
  unsavedChanges: UnsavedChange[];
  saveAll: () => Promise<void>;
  saveSection: (id: string) => Promise<void>;
  resetSection: (id: string) => void;
  resetAll: () => void;
  isSaving: boolean;
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  // Discovery mode
  discoveryMode: boolean;
  setDiscoveryMode: (enabled: boolean) => void;
}

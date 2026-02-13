export { useTangent } from "./hooks/useTangent";
export { TangentProvider, TangentContext } from "./context/TangentContext";
export { TangentRoot } from "./components/TangentRoot";
export type {
  TangentConfig,
  TangentValue,
  TangentControls,
  TangentRegistration,
  HistoryState,
  ViewportSize,
  UnsavedChange,
} from "./types";

// Schema - structured tuning format
export {
  emitTuningEvent,
  onTuningEvent,
  detectValueType,
  sessionToMarkdown,
} from "./schema";
export type {
  TuningEvent,
  TuningEventType,
  TuningEventPayload,
  TuningEventListener,
  TuningRegistration as TuningSchemaRegistration,
  TuningProperty,
  TuningSession,
  TuningValueType,
  ValueChangedPayload,
  ValueSavedPayload,
  ValueResetPayload,
  RegistrationPayload,
  DiscoveryInspectedPayload,
  SuggestedProperty,
  AgentSuggestion,
} from "./schema";

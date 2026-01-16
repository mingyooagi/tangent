export type TangentValue = number | string | boolean

export interface TangentConfig {
  [key: string]: TangentValue
}

export interface TangentControls<T extends TangentConfig> {
  values: T
  set: <K extends keyof T>(key: K, value: T[K]) => void
}

export interface TangentRegistration {
  id: string
  filePath: string
  originalConfig: TangentConfig
  currentConfig: TangentConfig
  onUpdate: (key: string, value: TangentValue) => void
}

export interface TangentContextValue {
  registrations: Map<string, TangentRegistration>
  register: (registration: TangentRegistration) => void
  unregister: (id: string) => void
  updateValue: (id: string, key: string, value: TangentValue) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  showCode: boolean
  setShowCode: (show: boolean) => void
  endpoint: string
}

import type { TangentConfig, TangentValue } from './types'

const configStore = new Map<string, TangentConfig>()

export function getStoredConfig(id: string): TangentConfig | undefined {
  return configStore.get(id)
}

export function setStoredConfig(id: string, config: TangentConfig): void {
  configStore.set(id, { ...config })
}

export function updateStoredConfig(id: string, key: string, value: TangentValue): void {
  const existing = configStore.get(id)
  if (existing) {
    configStore.set(id, { ...existing, [key]: value })
  }
}

export function clearStoredConfig(id: string): void {
  configStore.delete(id)
}

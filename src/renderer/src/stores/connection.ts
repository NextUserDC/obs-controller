import { create } from 'zustand'
import type { ConnectionConfig, ConnectionStatus, AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { obs } from '../lib/obs'

interface ConnectionState {
  status: ConnectionStatus
  config: ConnectionConfig
  settings: AppSettings
  initialized: boolean
  connectDialogOpen: boolean
  platform: string

  init: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  updateConfig: (partial: Partial<ConnectionConfig>) => void
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
  setConnectDialogOpen: (open: boolean) => void
  setStatus: (status: ConnectionStatus) => void
}

const defaultConfig: ConnectionConfig = {
  host: '127.0.0.1',
  port: 4455,
  password: ''
}

export const useConnection = create<ConnectionState>((set, get) => ({
  status: { state: 'disconnected' },
  config: defaultConfig,
  settings: DEFAULT_SETTINGS,
  initialized: false,
  connectDialogOpen: false,
  platform: 'win32',

  init: async () => {
    if (get().initialized) return
    const [saved, settings, platform, status] = await Promise.all([
      obs.getSavedConnection(),
      obs.getSettings(),
      obs.getPlatform(),
      obs.getConnectionStatus()
    ])
    set({
      config: saved ?? defaultConfig,
      settings,
      platform,
      status,
      initialized: true
    })
  },

  connect: async () => {
    const { config } = get()
    obs.saveConnection(config)
    const status = await obs.connect(config)
    set({ status })
  },

  disconnect: async () => {
    await obs.disconnect()
    set({ status: { state: 'disconnected' } })
  },

  updateConfig: (partial) => {
    set((s) => ({ config: { ...s.config, ...partial } }))
  },

  updateSettings: async (partial) => {
    const merged = await obs.saveSettings(partial)
    set({ settings: merged })
  },

  setConnectDialogOpen: (open) => set({ connectDialogOpen: open }),

  setStatus: (status) => set({ status })
}))

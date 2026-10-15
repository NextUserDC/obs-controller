import { contextBridge, ipcRenderer } from 'electron'
import type {
  ConnectionConfig,
  ConnectionStatus,
  AppSettings,
  ObsEventPayload,
  ObsControllerApi
} from '@shared/types'

const api: ObsControllerApi = {
  connect: (config: ConnectionConfig): Promise<ConnectionStatus> =>
    ipcRenderer.invoke('obs:connect', config),
  disconnect: (): Promise<void> => ipcRenderer.invoke('obs:disconnect'),
  getConnectionStatus: (): Promise<ConnectionStatus> =>
    ipcRenderer.invoke('obs:getStatus'),
  callRequest: <T = unknown>(
    requestType: string,
    requestData?: Record<string, unknown>
  ): Promise<T> => ipcRenderer.invoke('obs:call', requestType, requestData),
  getSavedConnection: (): Promise<ConnectionConfig | null> =>
    ipcRenderer.invoke('obs:getSavedConnection'),
  saveConnection: (config: ConnectionConfig): Promise<void> =>
    ipcRenderer.invoke('obs:saveConnection', config),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('obs:getSettings'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('obs:saveSettings', settings),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('obs:getPlatform'),
  onEvent: (callback: (payload: ObsEventPayload) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: ObsEventPayload): void => {
      callback(payload)
    }
    ipcRenderer.on('obs:event', listener)
    return () => {
      ipcRenderer.removeListener('obs:event', listener)
    }
  },
  onStatus: (callback: (status: ConnectionStatus) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, status: ConnectionStatus): void => {
      callback(status)
    }
    ipcRenderer.on('obs:status', listener)
    return () => {
      ipcRenderer.removeListener('obs:status', listener)
    }
  }
}

contextBridge.exposeInMainWorld('obsController', api)

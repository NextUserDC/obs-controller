import { ipcMain, BrowserWindow } from 'electron'
import { ObsClient } from './obs-client'
import { loadConnection, saveConnection } from './credentials'
import { loadSettings, saveSettings } from './settings'
import type { ConnectionConfig, AppSettings } from '@shared/types'

export function registerIpcHandlers(client: ObsClient): void {

  const settings = loadSettings()
  client.setReconnectOptions(
    settings.autoReconnect,
    settings.reconnectIntervalMs,
    settings.maxReconnectAttempts
  )

  client.setStatusListener((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('obs:status', status)
    }
  })

  client.setEventListener((eventType, eventData) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('obs:event', { eventType, eventData })
    }
  })

  ipcMain.handle('obs:connect', async (_e, config: ConnectionConfig) => {
    return client.connect(config)
  })

  ipcMain.handle('obs:disconnect', async () => {
    return client.disconnect()
  })

  ipcMain.handle('obs:getStatus', async () => {
    return client.getStatus()
  })

  ipcMain.handle(
    'obs:call',
    async (_e, requestType: string, requestData?: Record<string, unknown>) => {
      return client.callRequest(requestType, requestData)
    }
  )

  ipcMain.handle('obs:getSavedConnection', async () => {
    return loadConnection()
  })

  ipcMain.handle('obs:saveConnection', async (_e, config: ConnectionConfig) => {
    saveConnection(config)
  })

  ipcMain.handle('obs:getSettings', async () => {
    return loadSettings()
  })

  ipcMain.handle('obs:saveSettings', async (_e, partial: Partial<AppSettings>) => {
    return saveSettings(partial)
  })

  ipcMain.handle('obs:getPlatform', async () => {
    return process.platform
  })
}

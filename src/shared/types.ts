

export interface ConnectionConfig {
  host: string
  port: number
  password: string
}

export type ConnectionStatus =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | {
      state: 'connected'
      obsVersion: string
      obsWebSocketVersion: string
    }
  | { state: 'reconnecting'; attempt: number }
  | { state: 'error'; message: string }

export interface AppSettings {
  autoReconnect: boolean
  reconnectIntervalMs: number
  maxReconnectAttempts: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoReconnect: true,
  reconnectIntervalMs: 3000,
  maxReconnectAttempts: 20
}

export interface ObsEventPayload {
  eventType: string
  eventData: Record<string, unknown>
}

export interface ObsControllerApi {

  connect(config: ConnectionConfig): Promise<ConnectionStatus>
  disconnect(): Promise<void>
  getConnectionStatus(): Promise<ConnectionStatus>

  callRequest<T = unknown>(
    requestType: string,
    requestData?: Record<string, unknown>
  ): Promise<T>

  getSavedConnection(): Promise<ConnectionConfig | null>
  saveConnection(config: ConnectionConfig): Promise<void>

  getSettings(): Promise<AppSettings>
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>

  getPlatform(): Promise<string>

  onEvent(callback: (payload: ObsEventPayload) => void): () => void
  onStatus(callback: (status: ConnectionStatus) => void): () => void
}

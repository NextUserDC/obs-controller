import { OBSWebSocket } from 'obs-websocket-js'
import type { ConnectionConfig, ConnectionStatus } from '@shared/types'

type StatusListener = (status: ConnectionStatus) => void
type EventListener = (eventType: string, eventData: Record<string, unknown>) => void

export class ObsClient {
  private client = new OBSWebSocket()
  private statusListeners = new Set<StatusListener>()
  private eventListeners = new Set<EventListener>()
  private config: ConnectionConfig | null = null
  private status: ConnectionStatus = { state: 'disconnected' }
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private intentionalDisconnect = false
  private autoReconnect = true
  private maxReconnectAttempts = 20
  private reconnectIntervalMs = 3000
  private obsVersion = 'unknown'
  private obsWebSocketVersion = 'unknown'

  constructor() {

    const client = this.client as unknown as {
      emit: (eventType: string, ...args: unknown[]) => boolean
    }
    const originalEmit = client.emit.bind(this.client)
    const ignored = new Set([
      'Hello',
      'ConnectionOpened',
      'ConnectionClosed',
      'ConnectionError',
      'Identified'
    ])
    client.emit = (eventType: string, ...args: unknown[]): boolean => {
      if (!eventType.startsWith('Internal') && !ignored.has(eventType)) {
        const data = (args[0] ?? {}) as Record<string, unknown>
        this.emitEvent(eventType, data)
      }
      return originalEmit(eventType, ...args)
    }

    this.client.on('Identified', () => {
      this.reconnectAttempt = 0
      this.setStatus({
        state: 'connected',
        obsVersion: this.obsVersion,
        obsWebSocketVersion: this.obsWebSocketVersion
      })

      this.client
        .call('GetVersion' as never)
        .then((res) => {
          const version = (res as { obsVersion?: string } | null)?.obsVersion
          if (version) {
            this.obsVersion = version
            this.setStatus({
              state: 'connected',
              obsVersion: this.obsVersion,
              obsWebSocketVersion: this.obsWebSocketVersion
            })
          }
        })
        .catch(() => {})
    })

    this.client.on('ConnectionError', (err) => {
      const message =
        err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error de conexión'
      this.setStatus({ state: 'error', message })
      this.maybeReconnect()
    })

    this.client.on('ConnectionClosed', () => {
      this.setStatus({ state: 'disconnected' })
      if (!this.intentionalDisconnect) {
        this.maybeReconnect()
      }
    })
  }

  private buildUrl(config: ConnectionConfig): string {
    return `ws://${config.host}:${config.port}`
  }

  setStatusListener(fn: StatusListener): void {
    this.statusListeners.add(fn)
  }

  setEventListener(fn: EventListener): void {
    this.eventListeners.add(fn)
  }

  setReconnectOptions(autoReconnect: boolean, intervalMs: number, maxAttempts: number): void {
    this.autoReconnect = autoReconnect
    this.reconnectIntervalMs = intervalMs
    this.maxReconnectAttempts = maxAttempts
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  async connect(config: ConnectionConfig): Promise<ConnectionStatus> {
    this.intentionalDisconnect = false
    this.reconnectAttempt = 0
    this.config = config
    this.setStatus({ state: 'connecting' })
    try {
      const hello = await this.client.connect(this.buildUrl(config), config.password || undefined)
      this.obsWebSocketVersion = hello.obsWebSocketVersion ?? 'unknown'

      return this.status
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo conectar'
      this.setStatus({ state: 'error', message })
      return this.status
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true
    this.clearReconnectTimer()
    try {
      await this.client.disconnect()
    } catch {

    }
    this.setStatus({ state: 'disconnected' })
  }

  async callRequest<T = unknown>(
    requestType: string,
    requestData?: Record<string, unknown>
  ): Promise<T> {

    const result = await this.client.call(
      requestType as never,
      requestData as never
    )
    return result as T
  }

  private maybeReconnect(): void {
    if (this.intentionalDisconnect || !this.autoReconnect || !this.config) return
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.setStatus({
        state: 'error',
        message: `Se alcanzó el máximo de intentos de reconexión (${this.maxReconnectAttempts})`
      })
      return
    }
    this.reconnectAttempt++
    this.setStatus({ state: 'reconnecting', attempt: this.reconnectAttempt })
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(
      async () => {
        if (this.intentionalDisconnect || !this.config) return
        try {
          await this.client.connect(this.buildUrl(this.config), this.config.password || undefined)
        } catch {
          this.maybeReconnect()
        }
      },
      this.reconnectIntervalMs * this.reconnectAttempt
    )
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    for (const fn of this.statusListeners) {
      try {
        fn(status)
      } catch {

      }
    }
  }

  private emitEvent(eventType: string, eventData: Record<string, unknown>): void {
    for (const fn of this.eventListeners) {
      try {
        fn(eventType, eventData)
      } catch {

      }
    }
  }
}

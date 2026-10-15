import { useEffect } from 'react'
import { useConnection } from '../stores/connection'

export function ConnectDialog() {
  const {
    config,
    updateConfig,
    connect,
    disconnect,
    status,
    connectDialogOpen,
    setConnectDialogOpen
  } = useConnection()

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setConnectDialogOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setConnectDialogOpen])

  if (!connectDialogOpen) return null

  const busy = status.state === 'connecting' || status.state === 'reconnecting'
  const connected = status.state === 'connected'

  const handleConnect = async (): Promise<void> => {
    await connect()
  }

  const handleDisconnect = async (): Promise<void> => {
    await disconnect()
  }

  return (
    <div className="modal-overlay" onClick={() => setConnectDialogOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Conexión a OBS WebSocket</span>
          <button className="modal-close" onClick={() => setConnectDialogOpen(false)}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Host / IP del servidor OBS</label>
            <input
              type="text"
              placeholder="127.0.0.1 o 192.168.1.10"
              value={config.host}
              onChange={(e) => updateConfig({ host: e.target.value })}
              disabled={connected || busy}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Puerto</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => updateConfig({ port: Number(e.target.value) || 4455 })}
                disabled={connected || busy}
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="La definida en OBS"
                value={config.password}
                onChange={(e) => updateConfig({ password: e.target.value })}
                disabled={connected || busy}
              />
            </div>
          </div>

          {status.state === 'error' && (
            <div className="conn-info-box" style={{ borderColor: 'var(--danger)' }}>
              <strong className="text-danger">Error:</strong> {status.message}
            </div>
          )}
          {status.state === 'reconnecting' && (
            <div className="conn-info-box" style={{ borderColor: 'var(--warning)' }}>
              <span className="text-warning">Reconectando… intento {status.attempt}</span>
            </div>
          )}
          {connected && (
            <div className="conn-info-box" style={{ borderColor: 'var(--success)' }}>
              <span className="text-success">Conectado a OBS</span>
              <br />
              OBS: {(status as { obsVersion?: string }).obsVersion ?? '—'} · WebSocket:{' '}
              {(status as { obsWebSocketVersion?: string }).obsWebSocketVersion ?? '—'}
            </div>
          )}

          <div className="conn-info-box">
            <strong>Cómo habilitar el servidor en OBS:</strong>
            <ol>
              <li>En OBS: Herramientas → Servidor WebSocket</li>
              <li>Marca «Habilitar servidor WebSocket»</li>
              <li>Permite conexiones remotas y define una contraseña</li>
              <li>En el firewall de Windows permite el puerto (4455)</li>
            </ol>
          </div>
        </div>
        <div className="modal-footer">
          {connected ? (
            <button className="btn btn-danger" onClick={handleDisconnect}>
              Desconectar
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={busy || !config.host}
            >
              {busy && <span className="spinner" />}
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useConnection } from '../stores/connection'
import { Toggle } from '../components/Toggle'

export function SettingsModule() {
  const { settings, updateSettings, status, platform } = useConnection()

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>⚙️ Conexión</span>
        </div>
        <div className="panel-body">
          <div className="conn-info-box">
            <strong>Estado actual:</strong>{' '}
            {status.state === 'connected' ? (
              <span className="text-success">
                Conectado a {(status as { obsVersion?: string }).obsVersion}
              </span>
            ) : (
              <span className="text-muted">{status.state}</span>
            )}
            <br />
            <strong>Plataforma:</strong> {platform}
            <br />
            <strong>Puerto del servidor OBS:</strong> 4455 (por defecto)
          </div>
          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
            Para cambiar IP, puerto o contraseña, haz clic en el indicador de conexión de la barra
            superior.
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>🔄 Reconexión automática</span>
        </div>
        <div className="panel-body">
          <Toggle
            checked={settings.autoReconnect}
            label="Reconectar automáticamente si se pierde la conexión"
            onChange={(v) => updateSettings({ autoReconnect: v })}
          />
          <div className="field-row mt-2">
            <div className="field" style={{ maxWidth: 220 }}>
              <label>Intervalo base (ms)</label>
              <input
                type="number"
                value={settings.reconnectIntervalMs}
                disabled={!settings.autoReconnect}
                onChange={(e) =>
                  updateSettings({ reconnectIntervalMs: Number(e.target.value) || 3000 })
                }
              />
            </div>
            <div className="field" style={{ maxWidth: 220 }}>
              <label>Máximo de intentos</label>
              <input
                type="number"
                value={settings.maxReconnectAttempts}
                disabled={!settings.autoReconnect}
                onChange={(e) =>
                  updateSettings({ maxReconnectAttempts: Number(e.target.value) || 20 })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>ℹ️ Acerca de OBS Controller</span>
        </div>
        <div className="panel-body">
          <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            <strong>OBS Controller</strong> v0.1.0 — Panel de control remoto avanzado para OBS
            Studio mediante el protocolo obs-websocket v5.
            <br />
            Requisitos en el PC con OBS: OBS 28+ (o plugin obs-websocket), servidor WebSocket
            habilitado y firewall permitiendo el puerto 4455.
            <br />
            <span className="text-muted">
              Casi todas las funciones del protocolo son controlables desde esta app; usa la
              Consola JSON para cualquier request adicional.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

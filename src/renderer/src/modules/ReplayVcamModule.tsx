import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Led } from '../components/Led'

function formatTimecode(tc: string | undefined): string {
  if (!tc) return '00:00:00'
  return tc.split('.')[0] ?? tc
}

export function ReplayVcamModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { replayStatus, virtualCamStatus } = useObsState()

  if (!connected) return <NotConnected what="Replay Buffer y Cámara Virtual" />

  const replayActive = replayStatus?.outputActive ?? false
  const vcamActive = virtualCamStatus?.outputActive ?? false

  const toggleReplay = async (): Promise<void> => {
    await call(replayActive ? 'StopReplayBuffer' : 'StartReplayBuffer').catch((e) =>
      alert(`Error: ${e.message}`)
    )
  }

  const saveReplay = async (): Promise<void> => {
    await call('SaveReplayBuffer').then(
      () => alert('Replay guardado (según la configuración de salida en OBS).'),
      (e) => alert(`Error: ${e.message}`)
    )
  }

  const toggleVcam = async (): Promise<void> => {
    await call(vcamActive ? 'StopVirtualCam' : 'StartVirtualCam').catch((e) =>
      alert(`Error: ${e.message}`)
    )
  }

  return (
    <div className="grid-2">

      <div className="panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <span>🎞️ Replay Buffer</span>
          <div className="flex items-center gap-2">
            <Led color={replayActive ? 'green' : 'gray'} />
            <span style={{ fontWeight: 600 }}>{replayActive ? 'ACTIVO' : 'INACTIVO'}</span>
          </div>
        </div>
        <div className="panel-body">
          <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="stat-card">
              <div className="stat-label">Duración en buffer</div>
              <div className="stat-value">{formatTimecode(replayStatus?.outputTimecode)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bytes en buffer</div>
              <div className="stat-value">
                {((replayStatus?.outputBytes ?? 0) / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            <button
              className={`btn ${replayActive ? 'btn-danger' : 'btn-success'}`}
              onClick={toggleReplay}
            >
              {replayActive ? '⏹ Detener Replay Buffer' : '▶ Iniciar Replay Buffer'}
            </button>
            <button className="btn btn-primary" onClick={saveReplay} disabled={!replayActive}>
              💾 Guardar Replay AHORA
            </button>
          </div>
          <div className="text-muted mt-2" style={{ fontSize: 11.5 }}>
            El Replay Buffer guarda los últimos segundos de tu stream en un archivo cuando pulsas
            «Guardar». La duración del buffer se configura en OBS: Ajustes → Salida → Replay.
          </div>
        </div>
      </div>

      <div className="panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <span>📷 Cámara Virtual</span>
          <div className="flex items-center gap-2">
            <Led color={vcamActive ? 'green' : 'gray'} />
            <span style={{ fontWeight: 600 }}>{vcamActive ? 'ACTIVA' : 'INACTIVA'}</span>
          </div>
        </div>
        <div className="panel-body">
          <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="stat-card">
              <div className="stat-label">Duración activa</div>
              <div className="stat-value">{formatTimecode(virtualCamStatus?.outputTimecode)}</div>
            </div>
          </div>
          <button
            className={`btn mt-3 ${vcamActive ? 'btn-danger' : 'btn-success'}`}
            onClick={toggleVcam}
          >
            {vcamActive ? '⏹ Detener Cámara Virtual' : '▶ Iniciar Cámara Virtual'}
          </button>
          <div className="text-muted mt-2" style={{ fontSize: 11.5 }}>
            La cámara virtual de OBS aparece como un dispositivo «OBS Virtual Camera» en otras
            apps (Zoom, Teams, etc.). La configuración de salida se hace en OBS: Ajustes →
            Cámara virtual.
          </div>
        </div>
      </div>
    </div>
  )
}

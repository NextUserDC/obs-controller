import { useEffect, useState } from 'react'
import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Led } from '../components/Led'

function formatTimecode(tc: string | undefined): string {
  if (!tc) return '00:00:00'
  return tc.split('.')[0] ?? tc
}

export function StreamingModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { streamStatus } = useObsState()
  const [service, setService] = useState('rtmp_common')
  const [server, setServer] = useState('')
  const [key, setKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await tryCall<{
        streamServiceType: string
        streamServiceSettings: Record<string, unknown>
      }>('GetStreamServiceSettings')
      if (cancelled || !res) return
      setService(res.streamServiceType)
      setServer(String(res.streamServiceSettings.server ?? ''))
      setKey(String(res.streamServiceSettings.key ?? ''))
    })()
    return () => {
      cancelled = true
    }
  }, [connected])

  if (!connected) return <NotConnected what="el control de streaming" />

  const active = streamStatus?.outputActive ?? false
  const reconnecting = streamStatus?.outputReconnecting ?? false

  const saveService = async (): Promise<void> => {
    await call('SetStreamServiceSettings', {
      streamServiceType: service,
      streamServiceSettings: { server, key }
    }).then(
      () => alert('Configuración del servicio de streaming guardada.'),
      (e) => alert(`Error: ${e.message}`)
    )
  }

  const start = async (): Promise<void> => {
    await call('StartStream').catch((e) => alert(`No se pudo iniciar el stream:\n${e.message}`))
  }

  const stop = async (): Promise<void> => {
    if (!window.confirm('¿Detener la transmisión?')) return
    await call('StopStream').catch((e) => alert(`Error: ${e.message}`))
  }

  const pause = async (): Promise<void> => {
    await call('PauseStream').catch(() => {})
  }

  const resume = async (): Promise<void> => {
    await call('ResumeStream').catch(() => {})
  }

  const totalFrames = streamStatus?.outputTotalFrames ?? 0
  const skipped = streamStatus?.outputSkippedFrames ?? 0
  const dropPct = totalFrames > 0 ? (skipped / totalFrames) * 100 : 0

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>📡 Estado de la transmisión</span>
          <div className="flex items-center gap-2">
            <Led color={active ? (reconnecting ? 'yellow' : 'red') : 'gray'} pulse={active} />
            <span style={{ fontWeight: 600 }}>
              {reconnecting ? 'RECONECTANDO…' : active ? 'EN VIVO' : 'DETENIDO'}
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Duración</div>
              <div className="stat-value">{formatTimecode(streamStatus?.outputTimecode)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Congestión</div>
              <div className="stat-value">
                {((streamStatus?.outputCongestion ?? 0) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bytes enviados</div>
              <div className="stat-value">
                {((streamStatus?.outputBytes ?? 0) / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Frames perdidos</div>
              <div
                className={`stat-value ${dropPct > 2 ? 'bad' : dropPct > 0.5 ? 'warn' : 'good'}`}
              >
                {skipped}/{totalFrames} ({dropPct.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            {!active ? (
              <button className="btn btn-live" onClick={start}>
                <Led color="red" /> INICIAR STREAM
              </button>
            ) : (
              <>
                <button className="btn btn-danger" onClick={stop}>
                  DETENER STREAM
                </button>
                <button className="btn" onClick={pause}>
                  ⏸ Pausar
                </button>
                <button className="btn" onClick={resume}>
                  ▶ Reanudar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>⚙️ Configuración del servicio</span>
        </div>
        <div className="panel-body">
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Tipo de servicio</label>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="rtmp_common">RTMP (Twitch, YouTube, etc. — común)</option>
              <option value="rtmp_custom">RTMP personalizado</option>
              <option value="rtmp-dev">RTMP dev</option>
            </select>
          </div>
          <div className="field">
            <label>Servidor (URL)</label>
            <input
              type="text"
              placeholder="rtmp://..."
              value={server}
              onChange={(e) => setServer(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Clave de transmisión (stream key)</label>
            <div className="flex gap-2">
              <input
                type={keyVisible ? 'text' : 'password'}
                placeholder="Tu stream key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={() => setKeyVisible(!keyVisible)}>
                {keyVisible ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveService}>
            💾 Guardar configuración
          </button>
          <div className="text-muted mt-2" style={{ fontSize: 11.5 }}>
            La configuración se guarda en el perfil de OBS. También puedes configurarla desde OBS
            directamente (Ajustes → Transmisión).
          </div>
        </div>
      </div>
    </div>
  )
}

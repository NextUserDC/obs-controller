import { useEffect, useState } from 'react'
import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'

export function StatsModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { stats, eventLog, clearEventLog } = useObsState()
  const [eventFilter, setEventFilter] = useState('')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!connected || paused) return
    const interval = setInterval(async () => {
      const res = await tryCall<typeof stats>('GetStats')
      if (res) useObsState.setState({ stats: res })
    }, 1500)
    return () => clearInterval(interval)
  }, [connected, paused])

  if (!connected) return <NotConnected what="las estadísticas y eventos" />

  const filteredEvents = eventLog.filter((e) =>
    e.eventType.toLowerCase().includes(eventFilter.toLowerCase())
  )

  const pctClass = (v: number, warn: number, bad: number): string =>
    v > bad ? 'bad' : v > warn ? 'warn' : 'good'

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>📊 Estadísticas de OBS</span>
          <button className={`btn btn-sm ${paused ? 'btn-primary' : ''}`} onClick={() => setPaused(!paused)}>
            {paused ? '▶ Reanudar' : '⏸ Pausar'}
          </button>
        </div>
        <div className="panel-body">
          {stats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">CPU</div>
                <div className={`stat-value ${pctClass(stats.cpuUsage, 30, 60)}`}>
                  {stats.cpuUsage.toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Memoria OBS</div>
                <div className="stat-value">{stats.memoryUsage.toFixed(0)} MB</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">FPS activo</div>
                <div className="stat-value">{stats.activeFps.toFixed(1)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Disco disponible</div>
                <div className="stat-value">{stats.availableDiskSpace.toFixed(1)} GB</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Render perdidos</div>
                <div
                  className={`stat-value ${
                    stats.renderTotalFrames > 0 &&
                    (stats.renderSkippedFrames / stats.renderTotalFrames) * 100 > 1
                      ? 'warn'
                      : 'good'
                  }`}
                >
                  {stats.renderSkippedFrames}/{stats.renderTotalFrames}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Salida perdidos</div>
                <div
                  className={`stat-value ${
                    stats.outputTotalFrames > 0 &&
                    (stats.outputSkippedFrames / stats.outputTotalFrames) * 100 > 1
                      ? 'warn'
                      : 'good'
                  }`}
                >
                  {stats.outputSkippedFrames}/{stats.outputTotalFrames}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">WebSocket in</div>
                <div className="stat-value">{stats.webSocketSessionIncomingMessages}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">WebSocket out</div>
                <div className="stat-value">{stats.webSocketSessionOutgoingMessages}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted">Cargando estadísticas…</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>📡 Log de eventos en tiempo real ({eventLog.length})</span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filtrar por tipo…"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{
                padding: '4px 10px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
                fontSize: 12,
                width: 200
              }}
            />
            <button className="btn btn-sm" onClick={clearEventLog}>
              🗑 Limpiar
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="event-log">
            {filteredEvents.map((e) => (
              <div key={e.id} className="event-log-row">
                <span className="ev-time">{e.time}</span>
                <span className="ev-name">{e.eventType}</span>
                <span className="ev-data">{JSON.stringify(e.eventData)}</span>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-muted" style={{ padding: 12 }}>
                {eventFilter ? 'Ningún evento coincide.' : 'No hay eventos todavía. Cambia algo en OBS y aparecerá aquí.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

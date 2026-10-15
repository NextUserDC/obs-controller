import { useState } from 'react'
import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Led } from '../components/Led'

function formatTimecode(tc: string | undefined): string {
  if (!tc) return '00:00:00'
  return tc.split('.')[0] ?? tc
}

export function RecordingModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { recordStatus } = useObsState()
  const [splitRequested, setSplitRequested] = useState(false)

  if (!connected) return <NotConnected what="el control de grabación" />

  const active = recordStatus?.outputActive ?? false
  const paused = recordStatus?.outputPaused ?? false

  const start = async (): Promise<void> => {
    await call('StartRecord').catch((e) => alert(`No se pudo iniciar la grabación:\n${e.message}`))
  }

  const stop = async (): Promise<void> => {
    const res = await tryCall<{ outputPath: string }>('StopRecord')
    if (res?.outputPath) {
      alert(`Grabación guardada en:\n${res.outputPath}`)
    }
  }

  const pause = async (): Promise<void> => {
    await call('PauseRecord').catch(() => {})
  }

  const resume = async (): Promise<void> => {
    await call('ResumeRecord').catch(() => {})
  }

  const split = async (): Promise<void> => {
    setSplitRequested(true)
    await call('SplitRecordFile').catch((e) => alert(`Error: ${e.message}`))
    setSplitRequested(false)
  }

  const createChapter = async (): Promise<void> => {
    const chapterName = window.prompt('Nombre del capítulo:')
    if (!chapterName?.trim()) return
    await call('CreateRecordChapter', { chapterName: chapterName.trim() }).catch((e) =>
      alert(`Error: ${e.message}`)
    )
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>⏺️ Estado de la grabación</span>
          <div className="flex items-center gap-2">
            <Led color={active ? (paused ? 'yellow' : 'red') : 'gray'} pulse={active && !paused} />
            <span style={{ fontWeight: 600 }}>
              {active ? (paused ? 'GRABACIÓN PAUSADA' : 'GRABANDO') : 'DETENIDA'}
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Duración</div>
              <div className="stat-value">{formatTimecode(recordStatus?.outputTimecode)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bytes grabados</div>
              <div className="stat-value">
                {((recordStatus?.outputBytes ?? 0) / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            {!active ? (
              <button className="btn btn-danger" onClick={start}>
                <Led color="red" /> INICIAR GRABACIÓN
              </button>
            ) : (
              <>
                <button className="btn btn-danger" onClick={stop}>
                  DETENER Y GUARDAR
                </button>
                {paused ? (
                  <button className="btn" onClick={resume}>
                    ▶ Reanudar
                  </button>
                ) : (
                  <button className="btn" onClick={pause}>
                    ⏸ Pausar
                  </button>
                )}
                <button className="btn" onClick={split} disabled={splitRequested}>
                  ✂ Split (nuevo archivo)
                </button>
                <button className="btn" onClick={createChapter}>
                  📑 Crear capítulo
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>ℹ️ Información</span>
        </div>
        <div className="panel-body">
          <div className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            La ruta de grabación, formato y codificador se configuran en OBS: <em>Ajustes →
            Grabación</em>. Cuando detienes la grabación desde aquí, la app te mostrará la ruta
            final del archivo guardado. El <strong>Split</strong> inicia un archivo nuevo sin
            detener la grabación, útil para marcar momentos importantes en directo.
          </div>
        </div>
      </div>
    </div>
  )
}

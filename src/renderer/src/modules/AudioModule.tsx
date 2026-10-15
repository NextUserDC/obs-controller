import { useState, useEffect, useCallback } from 'react'
import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'

interface AudioChannel {
  inputName: string
  inputKind: string
  volumeDb: number
  muted: boolean
  syncOffsetMs: number
  monitoringType: string
  balance: number
  advanced: boolean
}

const MONITOR_LABELS: Record<string, string> = {
  OBS_MONITORING_TYPE_NONE: 'Sin monitoreo',
  OBS_MONITORING_TYPE_MONITOR_ONLY: 'Solo monitoreo (no sale en stream)',
  OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT: 'Monitoreo + salida'
}

function kindLabel(kind: string): string {
  if (kind.includes('wasapi_input') || kind.includes('audio_input')) return 'Micrófono'
  if (kind.includes('wasapi_output') || kind.includes('audio_output')) return 'Audio escritorio'
  if (kind.includes('media_source')) return 'Media'
  if (kind.includes('ffmpeg')) return 'Media (ffmpeg)'
  if (kind.includes('vlc')) return 'VLC'
  return kind
}

export function AudioModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const inputList = useObsState((s) => s.inputList)
  const refreshInputs = useObsState((s) => s.refreshInputs)

  const [channels, setChannels] = useState<AudioChannel[]>([])
  const [loading, setLoading] = useState(false)

  const loadChannels = useCallback(async () => {
    setLoading(true)
    const results: AudioChannel[] = []
    await Promise.all(
      inputList.map(async (inp) => {

        const vol = await tryCall<{ inputVolumeDb: number }>('GetInputVolume', {
          inputName: inp.inputName
        })
        if (!vol) return
        const [mute, sync, mon, bal] = await Promise.all([
          tryCall<{ inputMuted: boolean }>('GetInputMute', { inputName: inp.inputName }),
          tryCall<{ inputAudioSyncOffset: number }>('GetInputAudioSyncOffset', {
            inputName: inp.inputName
          }),
          tryCall<{ monitoringType: string }>('GetInputMonitoringType', {
            inputName: inp.inputName
          }),
          tryCall<{ inputAudioBalance: number }>('GetInputAudioBalance', {
            inputName: inp.inputName
          })
        ])
        results.push({
          inputName: inp.inputName,
          inputKind: inp.inputKind,
          volumeDb: vol.inputVolumeDb,
          muted: mute?.inputMuted ?? false,
          syncOffsetMs: sync?.inputAudioSyncOffset ?? 0,
          monitoringType: mon?.monitoringType ?? 'OBS_MONITORING_TYPE_NONE',
          balance: bal?.inputAudioBalance ?? 0.5,
          advanced: false
        })
      })
    )
    results.sort((a, b) => a.inputName.localeCompare(b.inputName))
    setChannels(results)
    setLoading(false)
  }, [inputList])

  useEffect(() => {
    if (!connected) return
    void loadChannels()
  }, [connected, loadChannels])

  const patch = (name: string, changes: Partial<AudioChannel>): void => {
    setChannels((prev) => prev.map((c) => (c.inputName === name ? { ...c, ...changes } : c)))
  }

  const setVolume = async (name: string, db: number): Promise<void> => {
    patch(name, { volumeDb: db })
    await call('SetInputVolume', { inputName: name, inputVolumeDb: db }).catch(() =>
      void loadChannels()
    )
  }

  const toggleMute = async (name: string, muted: boolean): Promise<void> => {
    patch(name, { muted })
    await call('SetInputMute', { inputName: name, inputMuted: muted }).catch(() =>
      void loadChannels()
    )
  }

  const setBalance = async (name: string, bal: number): Promise<void> => {
    patch(name, { balance: bal })
    await call('SetInputAudioBalance', { inputName: name, inputAudioBalance: bal }).catch(() =>
      void loadChannels()
    )
  }

  const setSync = async (name: string, ms: number): Promise<void> => {
    patch(name, { syncOffsetMs: ms })
    await call('SetInputAudioSyncOffset', { inputName: name, inputAudioSyncOffset: ms }).catch(
      () => void loadChannels()
    )
  }

  const setMonitoring = async (name: string, monitoringType: string): Promise<void> => {
    patch(name, { monitoringType })
    await call('SetInputMonitoringType', { inputName: name, monitoringType }).catch(() =>
      void loadChannels()
    )
  }

  if (!connected) return <NotConnected />

  return (
    <div className="panel">
      <div className="panel-header">
        <span>🎚️ Mezclador de audio</span>
        <div className="btn-group">
          <button
            className="btn btn-sm"
            onClick={() => {
              void refreshInputs()
              void loadChannels()
            }}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : '🔄 Actualizar'}
          </button>
        </div>
      </div>
      <div className="panel-body">
        {channels.length === 0 && !loading && (
          <div className="text-muted" style={{ padding: 16 }}>
            No se detectaron fuentes con audio. Añade una fuente de audio (micrófono, audio de
            escritorio o media) en el módulo “Fuentes”.
          </div>
        )}

        <div className="audio-mixer">
          {channels.map((ch) => (
            <div key={ch.inputName} className={`audio-strip ${ch.muted ? 'is-muted' : ''}`}>
              <div className="audio-strip-head">
                <div className="audio-identity">
                  <span className="audio-name">{ch.inputName}</span>
                  <span className="audio-kind">{kindLabel(ch.inputKind)}</span>
                </div>
                <button
                  className={`btn btn-sm mute-btn ${ch.muted ? 'active' : ''}`}
                  onClick={() => void toggleMute(ch.inputName, !ch.muted)}
                >
                  {ch.muted ? '🔇 MUTEADO' : '🔊 Sonando'}
                </button>
              </div>

              <div className="slider-row">
                <input
                  type="range"
                  min={-90}
                  max={0}
                  step={0.1}
                  value={ch.volumeDb}
                  onChange={(e) => patch(ch.inputName, { volumeDb: Number(e.target.value) })}
                  onPointerUp={(e) =>
                    void setVolume(ch.inputName, Number((e.target as HTMLInputElement).value))
                  }
                />
                <span className="slider-value">{ch.volumeDb.toFixed(1)} dB</span>
              </div>

              <button
                className="link-btn"
                onClick={() => patch(ch.inputName, { advanced: !ch.advanced })}
              >
                {ch.advanced ? '▲ Menos opciones' : '▼ Avanzado (balance, sincronía, monitoreo)'}
              </button>

              {ch.advanced && (
                <div className="audio-advanced">
                  <div>
                    <label className="text-muted" style={{ fontSize: 12 }}>
                      Balance (0 = izquierda, 0.5 = centro, 1 = derecha)
                    </label>
                    <div className="slider-row mt-2">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={ch.balance}
                        onChange={(e) =>
                          patch(ch.inputName, { balance: Number(e.target.value) })
                        }
                        onPointerUp={(e) =>
                          void setBalance(ch.inputName, Number((e.target as HTMLInputElement).value))
                        }
                      />
                      <span className="slider-value">{ch.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted" style={{ fontSize: 12 }}>
                      Sincronía (ms) — positivo retrasa el audio
                    </label>
                    <input
                      type="number"
                      className="mt-2"
                      value={ch.syncOffsetMs}
                      onChange={(e) => patch(ch.inputName, { syncOffsetMs: Number(e.target.value) })}
                      onBlur={(e) => void setSync(ch.inputName, Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="text-muted" style={{ fontSize: 12 }}>
                      Monitoreo
                    </label>
                    <select
                      className="text-input mt-2"
                      value={ch.monitoringType}
                      onChange={(e) => void setMonitoring(ch.inputName, e.target.value)}
                    >
                      {Object.entries(MONITOR_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

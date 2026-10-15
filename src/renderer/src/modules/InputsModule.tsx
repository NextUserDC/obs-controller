import { useState, useEffect } from 'react'
import { useObsState, type InputEntry } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Toggle } from '../components/Toggle'

const KIND_LABELS: Record<string, string> = {
  browser_source: 'Navegador',
  color_source_v3: 'Color / Sólido',
  ffmpeg_source: 'Media (archivo)',
  game_capture: 'Captura de juego',
  window_capture: 'Captura de ventana',
  display_capture: 'Captura de pantalla',
  monitor_capture: 'Captura de pantalla (antigua)',
  dshow_input: 'Dispositivo de video (cámara)',
  wasapi_input_capture: 'Audio: Micrófono',
  wasapi_output_capture: 'Audio: Escritorio',
  image_source: 'Imagen',
  text_ft2_source_v2: 'Texto (FreeType 2)',
  text_ft2_source: 'Texto (FreeType 2)',
  slideshow: 'Presentación de imágenes',
  ndi_source: 'NDI (si está instalado)',
  vlc_source: 'VLC (si está instalado)',
  cs_streaming_client: 'Capture Card'
}

const FALLBACK_KINDS = Object.keys(KIND_LABELS)

const MEDIA_ACTIONS: { action: string; label: string }[] = [
  { action: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY', label: '▶ Play' },
  { action: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE', label: '⏸ Pausar' },
  { action: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP', label: '⏹ Stop' },
  { action: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART', label: '🔄 Restart' },
  { action: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS', label: '⏮ Prev' },
  { action: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT', label: '⏭ Next' }
]

interface PropertyPickerDef {
  inputKinds: string[]
  propertyName: string
  label: string

  settingKey: string
}

const PROPERTY_PICKERS: PropertyPickerDef[] = [
  {
    inputKinds: ['window_capture'],
    propertyName: 'window',
    label: 'Ventana a capturar',
    settingKey: 'window'
  },
  {
    inputKinds: ['display_capture'],
    propertyName: 'monitor',
    label: 'Monitor a capturar',
    settingKey: 'monitor'
  },
  {
    inputKinds: ['dshow_input'],
    propertyName: 'video_device_id',
    label: 'Cámara / dispositivo de video',
    settingKey: 'video_device_id'
  },
  {
    inputKinds: ['wasapi_input_capture'],
    propertyName: 'device_id',
    label: 'Micrófono',
    settingKey: 'device_id'
  },
  {
    inputKinds: ['wasapi_output_capture'],
    propertyName: 'device_id',
    label: 'Dispositivo de audio (escritorio)',
    settingKey: 'device_id'
  }
]

export function InputsModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { inputList, refreshSceneItems, refreshInputs } = useObsState()
  const [selected, setSelected] = useState<string | null>(null)
  const [newKind, setNewKind] = useState('browser_source')
  const [newName, setNewName] = useState('')
  const [obsKinds, setObsKinds] = useState<string[] | null>(null)

  useEffect(() => {
    if (!connected) {
      setObsKinds(null)
      return
    }
    let cancelled = false
    tryCall<{ inputKinds: string[] }>('GetInputKindList', { unversioned: false }).then((res) => {
      if (!cancelled && res?.inputKinds?.length) setObsKinds(res.inputKinds)
    })
    return () => {
      cancelled = true
    }
  }, [connected])

  const kindOptions = (obsKinds ?? FALLBACK_KINDS)
    .filter((k) => k !== 'group' && k !== 'scene')
    .map((k) => ({ kind: k, label: KIND_LABELS[k] ?? k }))

  const effectiveKind = kindOptions.some((k) => k.kind === newKind)
    ? newKind
    : (kindOptions[0]?.kind ?? 'browser_source')

  const selectedInput = inputList.find((i) => i.inputName === selected) ?? null

  if (!connected) return <NotConnected what="el control de fuentes" />

  const createInput = async (): Promise<void> => {
    if (!newName.trim()) return
    const sceneName = useObsState.getState().currentProgramSceneName
    if (!sceneName) return
    await call('CreateInput', {
      sceneName,
      inputName: newName.trim(),
      inputKind: effectiveKind,
      inputSettings: {},
      sceneItemEnabled: true
    })
    setNewName('')
    await refreshInputs()
    refreshSceneItems()
  }

  const removeInput = async (name: string): Promise<void> => {
    if (!window.confirm(`¿Eliminar la fuente "${name}"?`)) return
    await call('RemoveInput', { inputName: name })
    if (selected === name) setSelected(null)
    await refreshInputs()
    refreshSceneItems()
  }

  const renameInput = async (oldName: string): Promise<void> => {
    const newNameValue = window.prompt('Nuevo nombre de la fuente:', oldName)
    if (!newNameValue?.trim() || newNameValue.trim() === oldName) return
    await call('SetInputName', { inputName: oldName, newInputName: newNameValue.trim() })
    setSelected(newNameValue.trim())
    await refreshInputs()
    refreshSceneItems()
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>➕ Crear nueva fuente en la escena de programa</span>
        </div>
        <div className="panel-body">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la fuente"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createInput()}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)'
              }}
            />
            <select
              value={effectiveKind}
              onChange={(e) => setNewKind(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)'
              }}
            >
              {kindOptions.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={createInput} disabled={!newName.trim()}>
              + Crear
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '340px 1fr' }}>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <span>🖥️ Fuentes ({inputList.length})</span>
          </div>
          <div className="panel-body">
            <div className="list">
              {inputList.map((input) => (
                <div
                  key={input.inputUuid}
                  className={`list-item ${selected === input.inputName ? 'selected' : ''}`}
                  onClick={() => setSelected(input.inputName)}
                >
                  <span className="item-name">{input.inputName}</span>
                  <span className="item-badge">{input.inputKind.replace('_source', '')}</span>
                </div>
              ))}
              {inputList.length === 0 && (
                <div className="text-muted" style={{ padding: 12 }}>
                  No hay fuentes en OBS.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <span>
              {selectedInput ? `🎛️ ${selectedInput.inputName}` : 'Selecciona una fuente'}
            </span>
            {selectedInput && (
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => renameInput(selectedInput.inputName)}>
                  Renombrar
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => removeInput(selectedInput.inputName)}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
          <div className="panel-body">
            {selectedInput ? (
              <InputDetail input={selectedInput} />
            ) : (
              <div className="text-muted" style={{ padding: 24, textAlign: 'center' }}>
                Haz clic en una fuente de la lista para ver y editar sus propiedades, audio y
                controles multimedia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InputDetail({ input }: { input: InputEntry }) {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [rawJson, setRawJson] = useState('')
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [mute, setMute] = useState(false)
  const [volume, setVolume] = useState(0)
  const [balance, setBalance] = useState(0.5)
  const [syncOffset, setSyncOffset] = useState(0)
  const [monitorType, setMonitorType] = useState('OBS_MONITORING_TYPE_NONE')
  const [mediaStatus, setMediaStatus] = useState<Record<string, unknown> | null>(null)
  const [tab, setTab] = useState<'props' | 'audio' | 'media'>('props')

  useEffect(() => {
    let cancelled = false
    setSettings(null)
    setSettingsDirty(false)
    setRawJson('')
    ;(async () => {
      const res = await tryCall<{ inputSettings: Record<string, unknown> }>('GetInputSettings', {
        inputName: input.inputName
      })
      if (cancelled) return
      const s = res?.inputSettings ?? {}
      setSettings(s)
      setRawJson(JSON.stringify(s, null, 2))
      const muteRes = await tryCall<{ inputMuted: boolean }>('GetInputMute', {
        inputName: input.inputName
      })
      if (!cancelled && muteRes) setMute(muteRes.inputMuted)

      const volRes = await tryCall<{ inputVolumeDb: number }>('GetInputVolume', {
        inputName: input.inputName
      })
      if (!cancelled && volRes) setVolume(volRes.inputVolumeDb)
      const balRes = await tryCall<{ inputAudioBalance: number }>('GetInputAudioBalance', {
        inputName: input.inputName
      })
      if (!cancelled && balRes) setBalance(balRes.inputAudioBalance)
      const syncRes = await tryCall<{ inputAudioSyncOffset: number }>('GetInputAudioSyncOffset', {
        inputName: input.inputName
      })
      if (!cancelled && syncRes) setSyncOffset(syncRes.inputAudioSyncOffset)
      const monRes = await tryCall<{ monitorType: string }>('GetInputAudioMonitorType', {
        inputName: input.inputName
      })
      if (!cancelled && monRes) setMonitorType(monRes.monitorType)
      const mediaRes = await tryCall<Record<string, unknown>>('GetMediaInputStatus', {
        inputName: input.inputName
      })
      if (!cancelled) setMediaStatus(mediaRes)
    })()
    return () => {
      cancelled = true
    }
  }, [input.inputName])

  const isMedia = input.inputKind === 'ffmpeg_source' || input.inputKind === 'slideshow'
  const isAudio =
    input.inputKind.startsWith('wasapi') ||
    input.inputKind === 'dshow_input' ||
    input.inputKind === 'browser_source'

  const applySettingsFromJson = async (): Promise<void> => {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>
      await call('SetInputSettings', {
        inputName: input.inputName,
        inputSettings: parsed,
        overlay: false
      })
      setSettings(parsed)
      setSettingsDirty(false)
    } catch (e) {

      alert(`JSON inválido: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          className={`btn btn-sm ${tab === 'props' ? 'btn-primary' : ''}`}
          onClick={() => setTab('props')}
        >
          Propiedades
        </button>
        {isAudio && (
          <button
            className={`btn btn-sm ${tab === 'audio' ? 'btn-primary' : ''}`}
            onClick={() => setTab('audio')}
          >
            Audio
          </button>
        )}
        {isMedia && (
          <button
            className={`btn btn-sm ${tab === 'media' ? 'btn-primary' : ''}`}
            onClick={() => setTab('media')}
          >
            Multimedia
          </button>
        )}
      </div>

      {tab === 'props' && (
        <div>

          <PropertyPicker input={input} settings={settings} onApplied={() => {

            tryCall<{ inputSettings: Record<string, unknown> }>('GetInputSettings', {
              inputName: input.inputName
            }).then((res) => {
              if (res) {
                setSettings(res.inputSettings)
                setRawJson(JSON.stringify(res.inputSettings, null, 2))
                setSettingsDirty(false)
              }
            })
          }} />

          <div className="text-muted mb-2 mt-2" style={{ fontSize: 11.5 }}>
            Kind: <span className="mono">{input.inputKind}</span> · Edita las propiedades como
            JSON (los campos varían según el tipo de fuente).
          </div>
          <textarea
            value={rawJson}
            onChange={(e) => {
              setRawJson(e.target.value)
              setSettingsDirty(true)
            }}
            rows={14}
            className="mono w-full"
            style={{
              padding: 10,
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: 12,
              resize: 'vertical'
            }}
          />
          <div className="flex gap-2 mt-2">
            <button className="btn btn-primary" onClick={applySettingsFromJson} disabled={!settingsDirty}>
              Aplicar cambios
            </button>
            <button
              className="btn"
              onClick={() => {
                setRawJson(JSON.stringify(settings, null, 2))
                setSettingsDirty(false)
              }}
            >
              Restablecer
            </button>
          </div>
        </div>
      )}

      {tab === 'audio' && (
        <div className="flex-col gap-3">
          <Toggle
            checked={mute}
            label={mute ? 'MUTEADO' : 'Sonido activo'}
            onChange={async (v) => {
              setMute(v)
              await call('SetInputMute', { inputName: input.inputName, inputMuted: v }).catch(
                () => setMute(!v)
              )
            }}
          />
          <div>
            <label className="text-muted" style={{ fontSize: 12 }}>
              Volumen (dB)
            </label>
            <div className="slider-row mt-2">
              <input
                type="range"
                min={-90}
                max={0}
                step={0.1}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onPointerUp={async (e) => {
                  const v = Number((e.target as HTMLInputElement).value)
                  await call('SetInputVolume', { inputName: input.inputName, inputVolumeDb: v })
                }}
              />
              <span className="slider-value">{volume.toFixed(1)} dB</span>
            </div>
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: 12 }}>
              Balance (0 = izquierda, 1 = derecha)
            </label>
            <div className="slider-row mt-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                onPointerUp={async (e) => {
                  const v = Number((e.target as HTMLInputElement).value)
                  await call('SetInputAudioBalance', {
                    inputName: input.inputName,
                    inputAudioBalance: v
                  })
                }}
              />
              <span className="slider-value">{balance.toFixed(2)}</span>
            </div>
          </div>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Sync offset (ms)</label>
            <input
              type="number"
              value={syncOffset}
              onChange={(e) => setSyncOffset(Number(e.target.value))}
              onBlur={async () => {
                await call('SetInputAudioSyncOffset', {
                  inputName: input.inputName,
                  inputAudioSyncOffset: syncOffset
                })
              }}
            />
          </div>
          <div className="field" style={{ maxWidth: 280 }}>
            <label>Monitorización</label>
            <select
              value={monitorType}
              onChange={async (e) => {
                setMonitorType(e.target.value)
                await call('SetInputAudioMonitorType', {
                  inputName: input.inputName,
                  monitorType: e.target.value
                })
              }}
            >
              <option value="OBS_MONITORING_TYPE_NONE">Ninguna</option>
              <option value="OBS_MONITORING_TYPE_MONITOR_ONLY">Solo monitor</option>
              <option value="OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT">Monitor y salida</option>
            </select>
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: 12 }}>
              Pistas de audio
            </label>
            <AudioTracks inputName={input.inputName} />
          </div>
        </div>
      )}

      {tab === 'media' && mediaStatus && (
        <div className="flex-col gap-3">
          <div className="text-muted" style={{ fontSize: 12 }}>
            Estado: <span className="mono">{String(mediaStatus.mediaState ?? '—')}</span> · Cursor:{' '}
            {String(mediaStatus.mediaCursor ?? 0)}ms / {String(mediaStatus.mediaDuration ?? 0)}ms
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {MEDIA_ACTIONS.map((a) => (
              <button
                key={a.action}
                className="btn btn-sm"
                onClick={async () => {
                  await call('TriggerMediaInputAction', {
                    inputName: input.inputName,
                    mediaAction: a.action
                  })
                  const res = await tryCall<Record<string, unknown>>('GetMediaInputStatus', {
                    inputName: input.inputName
                  })
                  setMediaStatus(res)
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="field" style={{ maxWidth: 240 }}>
            <label>Ir a posición (ms)</label>
            <div className="flex gap-2">
              <input
                type="number"
                id="media-cursor-input"
                placeholder="0"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const v = Number((e.target as HTMLInputElement).value)
                    await call('SetMediaInputCursor', {
                      inputName: input.inputName,
                      mediaCursor: v
                    })
                  }
                }}
              />
              <button
                className="btn"
                onClick={async () => {
                  const el = document.getElementById('media-cursor-input') as HTMLInputElement | null
                  const v = Number(el?.value ?? 0)
                  await call('SetMediaInputCursor', { inputName: input.inputName, mediaCursor: v })
                }}
              >
                Ir
              </button>
              <button
                className="btn"
                onClick={async () => {
                  const el = document.getElementById('media-cursor-input') as HTMLInputElement | null
                  const v = Number(el?.value ?? 0)
                  await call('OffsetMediaInputCursor', {
                    inputName: input.inputName,
                    mediaCursorOffset: v
                  })
                }}
              >
                Offset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PropertyPicker({
  input,
  settings,
  onApplied
}: {
  input: InputEntry
  settings: Record<string, unknown> | null
  onApplied: () => void
}) {
  const picker = PROPERTY_PICKERS.find((p) => p.inputKinds.includes(input.inputKind))
  const [items, setItems] = useState<{ label: string; value: string }[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!picker) {
      setItems(null)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const res = await tryCall<{ propertyItems: Record<string, unknown>[] }>(
        'GetInputPropertiesListPropertyItems',
        { inputName: input.inputName, propertyName: picker.propertyName }
      )
      if (cancelled) return
      setLoading(false)
      if (!res?.propertyItems) {
        setItems([])
        return
      }
      setItems(
        res.propertyItems.map((it) => ({
          label: String(it.itemName ?? it.itemValue ?? ''),
          value: String(it.itemValue ?? it.itemName ?? '')
        }))
      )
    })()
    return () => {
      cancelled = true
    }
  }, [input.inputName, input.inputKind, picker])

  if (!picker) return null

  const currentValue = settings?.[picker.settingKey] != null ? String(settings[picker.settingKey]) : ''

  const applyValue = async (value: string): Promise<void> => {
    await call('SetInputSettings', {
      inputName: input.inputName,
      inputSettings: { [picker.settingKey]: value },
      overlay: true
    })
    onApplied()
  }

  return (
    <div className="prop-picker">
      <label>{picker.label}</label>
      {loading ? (
        <div className="text-muted" style={{ fontSize: 12, padding: '6px 0' }}>
          Cargando opciones de OBS…
        </div>
      ) : items && items.length > 0 ? (
        <select value={currentValue} onChange={(e) => applyValue(e.target.value)}>
          {!currentValue && <option value="">(selecciona…)</option>}
          {items.map((it) => (
            <option key={it.value} value={it.value}>
              {it.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-muted" style={{ fontSize: 12 }}>
          OBS no devolvió opciones para esta propiedad. Edita el JSON de abajo manualmente
          ({picker.settingKey}).
        </div>
      )}
    </div>
  )
}

function AudioTracks({ inputName }: { inputName: string }) {
  const [tracks, setTracks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await tryCall<{ inputAudioTracks: Record<string, boolean> }>(
        'GetInputAudioTracks',
        { inputName }
      )
      if (!cancelled && res) setTracks(res.inputAudioTracks)
    })()
    return () => {
      cancelled = true
    }
  }, [inputName])

  const toggleTrack = async (track: string, value: boolean): Promise<void> => {
    const next = { ...tracks, [track]: value }
    setTracks(next)
    await call('SetInputAudioTracks', { inputName, inputAudioTracks: next }).catch(() => {})
  }

  const trackKeys = Object.keys(tracks)
  if (trackKeys.length === 0) {
    return <div className="text-muted">No hay pistas configuradas.</div>
  }

  return (
    <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
      {trackKeys.map((track) => (
        <Toggle
          key={track}
          checked={tracks[track] ?? false}
          label={`Pista ${track}`}
          onChange={(v) => toggleTrack(track, v)}
        />
      ))}
    </div>
  )
}

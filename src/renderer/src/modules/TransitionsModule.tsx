import { useState } from 'react'
import { useObsState, type TransitionEntry } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'

export function TransitionsModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const {
    transitionList,
    currentTransitionName,
    currentTransitionDuration,
    studioModeEnabled
  } = useObsState()
  const [duration, setDuration] = useState<number>(currentTransitionDuration ?? 300)
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null)
  const [settingsRaw, setSettingsRaw] = useState('')
  const [dirty, setDirty] = useState(false)

  if (!connected) return <NotConnected what="las transiciones" />

  const setCurrent = async (name: string): Promise<void> => {
    await call('SetCurrentSceneTransition', { transitionName: name }).catch((e) =>
      alert(`Error: ${e.message}`)
    )
  }

  const setDurationFn = async (ms: number): Promise<void> => {
    setDuration(ms)
    await call('SetCurrentSceneTransitionDuration', { transitionDuration: ms }).catch(() => {})
  }

  const openSettings = async (t: TransitionEntry): Promise<void> => {
    setSelectedTransition(t.transitionName)
    const res = await tryCall<{ transitionSettings: Record<string, unknown> }>(
      'GetCurrentSceneTransitionSettings'
    )
    setSettingsRaw(JSON.stringify(res?.transitionSettings ?? {}, null, 2))
    setDirty(false)
  }

  const saveSettings = async (): Promise<void> => {
    try {
      const parsed = JSON.parse(settingsRaw) as Record<string, unknown>
      await call('SetCurrentSceneTransitionSettings', { transitionSettings: parsed })
      setDirty(false)
    } catch (e) {
      alert(`JSON inválido: ${(e as Error).message}`)
    }
  }

  const tBar = async (position: number): Promise<void> => {

    await call('SetTBarPosition', { position: position / 100 }).catch(() => {})
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>🔄 Transiciones disponibles ({transitionList.length})</span>
        </div>
        <div className="panel-body">
          <div className="list">
            {transitionList.map((t) => (
              <div
                key={t.transitionUuid}
                className={`list-item ${currentTransitionName === t.transitionName ? 'selected' : ''}`}
                onClick={() => setCurrent(t.transitionName)}
              >
                <span className="item-name">
                  {t.transitionName} {t.transitionFixed ? '🔒' : ''}
                </span>
                <span className="item-badge">{t.transitionKind.replace('obs_transition_', '')}</span>
                {currentTransitionName === t.transitionName && (
                  <span className="item-badge badge-program">EN USO</span>
                )}
                {!t.transitionFixed && (
                  <button
                    className="btn btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openSettings(t)
                    }}
                  >
                    Ajustes…
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>⏱️ Transición actual: {currentTransitionName ?? '—'}</span>
        </div>
        <div className="panel-body">
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Duración de la transición (ms)</label>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={5000}
                step={50}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                onPointerUp={(e) => setDurationFn(Number((e.target as HTMLInputElement).value))}
              />
              <span className="slider-value">{duration} ms</span>
            </div>
          </div>

          {studioModeEnabled && (
            <div className="mt-2">
              <label className="text-muted" style={{ fontSize: 12 }}>
                T-Bar (transición manual)
              </label>
              <div className="slider-row mt-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={0}
                  onChange={(e) => tBar(Number(e.target.value))}
                />
                <span className="slider-value">0–100</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTransition && (
        <div className="panel">
          <div className="panel-header">
            <span>⚙️ Ajustes de «{selectedTransition}»</span>
          </div>
          <div className="panel-body">
            <textarea
              value={settingsRaw}
              onChange={(e) => {
                setSettingsRaw(e.target.value)
                setDirty(true)
              }}
              rows={10}
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
            <button className="btn btn-primary mt-2" onClick={saveSettings} disabled={!dirty}>
              Aplicar ajustes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

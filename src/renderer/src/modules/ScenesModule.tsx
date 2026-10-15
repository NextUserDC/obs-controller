import { useState } from 'react'
import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'

export function ScenesModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const {
    sceneList,
    currentProgramSceneName,
    currentPreviewSceneName,
    studioModeEnabled,
    currentTransitionDuration,
    refreshSceneItems,
    refreshScenes
  } = useObsState()
  const [newSceneName, setNewSceneName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)

  if (!connected) return <NotConnected what="el control de escenas" />

  const setProgramScene = async (name: string): Promise<void> => {
    await call('SetCurrentProgramScene', { sceneName: name })
    refreshSceneItems(name)
  }

  const setPreviewScene = async (name: string): Promise<void> => {
    await call('SetCurrentPreviewScene', { sceneName: name })
  }

  const createScene = async (): Promise<void> => {
    if (!newSceneName.trim()) return
    await call('CreateScene', { sceneName: newSceneName.trim() })
    setNewSceneName('')
    await refreshScenes()
  }

  const removeScene = async (name: string): Promise<void> => {
    if (sceneList.length <= 1) return
    if (!window.confirm(`¿Eliminar la escena "${name}"? Esta acción no se puede deshacer.`))
      return
    await call('RemoveScene', { sceneName: name })
    await refreshScenes()
  }

  const renameScene = async (oldName: string): Promise<void> => {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setRenaming(null)
      return
    }
    await call('SetSceneName', { sceneName: oldName, newSceneName: renameValue.trim() })
    setRenaming(null)
    await refreshScenes()
  }

  const enterStudio = async (): Promise<void> => {
    await call('SetStudioModeEnabled', { studioModeEnabled: true })
  }

  const leaveStudio = async (): Promise<void> => {
    await call('SetStudioModeEnabled', { studioModeEnabled: false })
  }

  const setTBar = async (position: number): Promise<void> => {

    await call('SetTBarPosition', { position: position / 100 })
  }

  const saveOverride = async (
    sceneName: string,
    transitionName: string | null,
    duration: number | null
  ): Promise<void> => {
    if (transitionName) {
      await call('SetSceneSceneTransitionOverride', {
        sceneName,
        transitionName,
        transitionDuration: duration ?? undefined
      })
    } else {
      await call('SetSceneSceneTransitionOverride', {
        sceneName,
        transitionName: null,
        transitionDuration: null
      })
    }
  }

  const doStudioTransition = (): void => {
    call('TriggerStudioModeTransition').catch(() => {})
  }

  return (
    <div>
      <div className="grid-2">

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <span>🎬 Escena de Programa (en vivo)</span>
          </div>
          <div className="panel-body">
            <div className="list">
              {sceneList.map((scene) => (
                <div
                  key={scene.sceneName}
                  className={`list-item ${currentProgramSceneName === scene.sceneName ? 'selected' : ''}`}
                  onClick={() => setProgramScene(scene.sceneName)}
                >
                  <span className="item-name">{scene.sceneName}</span>
                  {currentProgramSceneName === scene.sceneName && (
                    <span className="item-badge badge-program">PROGRAMA</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <span>👁️ Escena de Previsualización</span>
          </div>
          <div className="panel-body">
            {!studioModeEnabled ? (
              <div className="text-muted" style={{ padding: 12, fontSize: 12.5 }}>
                Activa el <strong>modo estudio</strong> para seleccionar qué escena va a preview.
              </div>
            ) : (
              <div className="list">
                {sceneList.map((scene) => (
                  <div
                    key={scene.sceneName}
                    className={`list-item ${currentPreviewSceneName === scene.sceneName ? 'selected' : ''}`}
                    onClick={() => setPreviewScene(scene.sceneName)}
                  >
                    <span className="item-name">{scene.sceneName}</span>
                    {currentPreviewSceneName === scene.sceneName && (
                      <span className="item-badge badge-preview">PREVIEW</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>🎛️ Modo Estudio y Transición</span>
          <div className="flex gap-2">
            {studioModeEnabled ? (
              <>
                <button className="btn btn-sm" onClick={doStudioTransition}>
                  ➜ Transición (duración: {currentTransitionDuration ?? '—'} ms)
                </button>
                <button className="btn btn-sm" onClick={leaveStudio}>
                  Salir del modo estudio
                </button>
              </>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={enterStudio}>
                Entrar al modo estudio
              </button>
            )}
          </div>
        </div>
        {studioModeEnabled && (
          <div className="panel-body">
            <label className="text-muted" style={{ fontSize: 12 }}>
              T-Bar (barra de transición manual)
            </label>
            <div className="slider-row mt-2">
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={0}
                onChange={(e) => setTBar(Number(e.target.value))}
              />
              <span className="slider-value">0–100</span>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>🛠️ Gestión de Escenas</span>
        </div>
        <div className="panel-body">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Nombre de la nueva escena"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createScene()}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)'
              }}
            />
            <button className="btn btn-primary" onClick={createScene} disabled={!newSceneName.trim()}>
              + Crear escena
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Escena</th>
                <th>Override de transición</th>
                <th style={{ width: 200 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sceneList.map((scene) => (
                <tr key={scene.sceneName}>
                  <td>
                    {renaming === scene.sceneName ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameScene(scene.sceneName)}
                        onKeyDown={(e) => e.key === 'Enter' && renameScene(scene.sceneName)}
                        autoFocus
                        style={{
                          padding: '3px 6px',
                          background: 'var(--bg-dark)',
                          border: '1px solid var(--accent)',
                          borderRadius: 3,
                          color: 'var(--text)'
                        }}
                      />
                    ) : (
                      scene.sceneName
                    )}
                  </td>
                  <td>
                    <OverrideCell sceneName={scene.sceneName} onSave={saveOverride} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setRenaming(scene.sceneName)
                          setRenameValue(scene.sceneName)
                        }}
                      >
                        Renombrar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeScene(scene.sceneName)}
                        disabled={sceneList.length <= 1}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OverrideCell({
  sceneName,
  onSave
}: {
  sceneName: string
  onSave: (
    sceneName: string,
    transitionName: string | null,
    duration: number | null
  ) => Promise<void>
}) {
  const transitionList = useObsState((s) => s.transitionList)
  const [open, setOpen] = useState(false)
  const [tName, setTName] = useState<string>('')
  const [tDur, setTDur] = useState<string>('')

  if (!open) {
    return (
      <button
        className="btn btn-sm"
        onClick={async () => {
          const res = await tryCall<{ transitionName: string | null; transitionDuration: number | null }>(
            'GetSceneSceneTransitionOverride',
            { sceneName }
          )
          setTName(res?.transitionName ?? '')
          setTDur(res?.transitionDuration != null ? String(res.transitionDuration) : '')
          setOpen(true)
        }}
      >
        Editar…
      </button>
    )
  }

  return (
    <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
      <select
        value={tName}
        onChange={(e) => setTName(e.target.value)}
        style={{
          padding: '3px 6px',
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-strong)',
          borderRadius: 3,
          color: 'var(--text)',
          fontSize: 11.5
        }}
      >
        <option value="">(sin override)</option>
        {transitionList.map((t) => (
          <option key={t.transitionUuid} value={t.transitionName}>
            {t.transitionName}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="ms"
        value={tDur}
        onChange={(e) => setTDur(e.target.value)}
        style={{
          width: 64,
          padding: '3px 6px',
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-strong)',
          borderRadius: 3,
          color: 'var(--text)',
          fontSize: 11.5
        }}
      />
      <button
        className="btn btn-sm btn-primary"
        onClick={() => {
          onSave(sceneName, tName || null, tDur ? Number(tDur) : null)
          setOpen(false)
        }}
      >
        Guardar
      </button>
      <button className="btn btn-sm" onClick={() => setOpen(false)}>
        ×
      </button>
    </div>
  )
}

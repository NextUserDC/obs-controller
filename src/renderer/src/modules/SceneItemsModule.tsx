import { useState } from 'react'
import { useObsState, type SceneItemEntry } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Toggle } from '../components/Toggle'

const BLEND_MODES = [
  'OBS_BLEND_NORMAL',
  'OBS_BLEND_ADDITIVE',
  'OBS_BLEND_SUBTRACT',
  'OBS_BLEND_SCREEN',
  'OBS_BLEND_MULTIPLY',
  'OBS_BLEND_LIGHTEN',
  'OBS_BLEND_DARKEN'
]

export function SceneItemsModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { sceneItemList, currentProgramSceneName, refreshSceneItems } = useObsState()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selected = sceneItemList.find((i) => i.sceneItemId === selectedId) ?? null

  if (!connected) return <NotConnected what="los elementos de escena" />

  const sceneName = currentProgramSceneName

  const setEnabled = async (item: SceneItemEntry, enabled: boolean): Promise<void> => {
    await call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: enabled
    }).catch(() => {})
    refreshSceneItems()
  }

  const setLocked = async (item: SceneItemEntry, locked: boolean): Promise<void> => {
    await call('SetSceneItemLocked', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemLocked: locked
    }).catch(() => {})
    refreshSceneItems()
  }

  const moveIndex = async (item: SceneItemEntry, dir: -1 | 1): Promise<void> => {
    const newIndex = item.sceneItemIndex + dir
    if (newIndex < 0 || newIndex >= sceneItemList.length) return
    await call('SetSceneItemIndex', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemIndex: newIndex
    }).catch(() => {})
    refreshSceneItems()
  }

  const removeItem = async (item: SceneItemEntry): Promise<void> => {
    if (!window.confirm(`¿Eliminar "${item.sourceName ?? item.sceneItemId}" de la escena?`)) return
    await call('RemoveSceneItem', { sceneName, sceneItemId: item.sceneItemId }).catch(() => {})
    if (selectedId === item.sceneItemId) setSelectedId(null)
    refreshSceneItems()
  }

  const duplicateItem = async (item: SceneItemEntry): Promise<void> => {
    await call('DuplicateSceneItem', { sceneName, sceneItemId: item.sceneItemId }).catch(() => {})
    refreshSceneItems()
  }

  const sorted = [...sceneItemList].sort((a, b) => b.sceneItemIndex - a.sceneItemIndex)

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>🧩 Elementos de «{sceneName ?? '—'}» (arrastra mentalmente: arriba = más al frente)</span>
          <button className="btn btn-sm" onClick={() => refreshSceneItems()}>
            🔄 Actualizar
          </button>
        </div>
        <div className="panel-body">
          <div className="list">
            {sorted.map((item) => (
              <div
                key={item.sceneItemId}
                className={`list-item ${selectedId === item.sceneItemId ? 'selected' : ''}`}
                onClick={() => setSelectedId(item.sceneItemId)}
              >
                <Toggle
                  checked={item.sceneItemEnabled}
                  onChange={(v) => setEnabled(item, v)}
                />
                <span
                  className="item-name"
                  style={
                    !item.sceneItemEnabled
                      ? { textDecoration: 'line-through', opacity: 0.5 }
                      : undefined
                  }
                >
                  {item.sourceName ?? `Item ${item.sceneItemId}`}
                  {item.isGroup ? ' 📁' : ''}
                </span>
                {item.sceneItemLocked && <span title="Bloqueado">🔒</span>}
                <span className="item-badge">{item.sceneItemBlendMode?.replace('OBS_BLEND_', '')}</span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm btn-icon" onClick={() => moveIndex(item, 1)} title="Subir (al frente)">
                    ▲
                  </button>
                  <button className="btn btn-sm btn-icon" onClick={() => moveIndex(item, -1)} title="Bajar (al fondo)">
                    ▼
                  </button>
                  <button className="btn btn-sm btn-icon" onClick={() => duplicateItem(item)} title="Duplicar">
                    ⧉
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={() => setLocked(item, !item.sceneItemLocked)}
                    title="Bloquear/desbloquear"
                  >
                    {item.sceneItemLocked ? '🔓' : '🔒'}
                  </button>
                  <button
                    className="btn btn-sm btn-icon btn-danger"
                    onClick={() => removeItem(item)}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {sceneItemList.length === 0 && (
              <div className="text-muted" style={{ padding: 12 }}>
                Esta escena no tiene elementos. Añade fuentes desde el módulo «Fuentes».
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="panel">
          <div className="panel-header">
            <span>📐 Transform de «{selected.sourceName ?? selected.sceneItemId}»</span>
          </div>
          <div className="panel-body">
            <TransformEditor item={selected} sceneName={sceneName ?? ''} onChanged={refreshSceneItems} />
          </div>
        </div>
      )}
    </div>
  )
}

function TransformEditor({
  item,
  sceneName,
  onChanged
}: {
  item: SceneItemEntry
  sceneName: string
  onChanged: () => void | Promise<void>
}) {
  const t = item.sceneItemTransform as {
    positionX?: number
    positionY?: number
    scaleX?: number
    scaleY?: number
    rotation?: number
    cropLeft?: number
    cropRight?: number
    cropTop?: number
    cropBottom?: number
    alignment?: number
    boundsType?: string
    boundsWidth?: number
    boundsHeight?: number
    sourceWidth?: number
    sourceHeight?: number
  } | null

  const [form, setForm] = useState({
    positionX: t?.positionX ?? 0,
    positionY: t?.positionY ?? 0,
    scaleX: t?.scaleX ?? 1,
    scaleY: t?.scaleY ?? 1,
    rotation: t?.rotation ?? 0,
    cropLeft: t?.cropLeft ?? 0,
    cropRight: t?.cropRight ?? 0,
    cropTop: t?.cropTop ?? 0,
    cropBottom: t?.cropBottom ?? 0,
    alignment: t?.alignment ?? 5,
    boundsWidth: t?.boundsWidth ?? 0,
    boundsHeight: t?.boundsHeight ?? 0,
    boundsType: t?.boundsType ?? 'OBS_BOUNDS_NONE'
  })

  const [dirty, setDirty] = useState(false)

  const set = (key: string, value: number | string): void => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const apply = async (): Promise<void> => {
    await call('SetSceneItemTransform', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemTransform: {
        positionX: form.positionX,
        positionY: form.positionY,
        scaleX: form.scaleX,
        scaleY: form.scaleY,
        rotation: form.rotation,
        cropLeft: form.cropLeft,
        cropRight: form.cropRight,
        cropTop: form.cropTop,
        cropBottom: form.cropBottom,
        alignment: form.alignment,
        boundsType: form.boundsType,
        boundsWidth: form.boundsWidth,
        boundsHeight: form.boundsHeight
      }
    }).catch((e) => alert(`Error: ${e.message}`))
    setDirty(false)
    onChanged()
  }

  const numField = (label: string, key: string, step = 1): React.JSX.Element => (
    <div className="field" style={{ marginBottom: 8 }}>
      <label>{label}</label>
      <input
        type="number"
        step={step}
        value={String(form[key as keyof typeof form])}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </div>
  )

  return (
    <div>
      <div className="grid-3" style={{ padding: 0 }}>
        <div>
          <div className="text-muted mb-2" style={{ fontSize: 11, fontWeight: 700 }}>
            POSICIÓN
          </div>
          {numField('X', 'positionX')}
          {numField('Y', 'positionY')}
        </div>
        <div>
          <div className="text-muted mb-2" style={{ fontSize: 11, fontWeight: 700 }}>
            ESCALA
          </div>
          {numField('Escala X', 'scaleX', 0.01)}
          {numField('Escala Y', 'scaleY', 0.01)}
          {numField('Rotación (°)', 'rotation', 1)}
        </div>
        <div>
          <div className="text-muted mb-2" style={{ fontSize: 11, fontWeight: 700 }}>
            RECORTE (crop)
          </div>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Izq</label>
              <input
                type="number"
                value={form.cropLeft}
                onChange={(e) => set('cropLeft', Number(e.target.value))}
              />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Der</label>
              <input
                type="number"
                value={form.cropRight}
                onChange={(e) => set('cropRight', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Sup</label>
              <input
                type="number"
                value={form.cropTop}
                onChange={(e) => set('cropTop', Number(e.target.value))}
              />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Inf</label>
              <input
                type="number"
                value={form.cropBottom}
                onChange={(e) => set('cropBottom', Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="field-row mt-2">
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Alineación (número)</label>
          <input
            type="number"
            value={form.alignment}
            onChange={(e) => set('alignment', Number(e.target.value))}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Tipo de bounds</label>
          <select
            value={form.boundsType}
            onChange={(e) => set('boundsType', e.target.value)}
          >
            <option value="OBS_BOUNDS_NONE">Ninguno</option>
            <option value="OBS_BOUNDS_STRETCH">Estirar</option>
            <option value="OBS_BOUNDS_SCALE_INNER">Escala interna</option>
            <option value="OBS_BOUNDS_SCALE_OUTER">Escala externa</option>
            <option value="OBS_BOUNDS_SCALE_TO_WIDTH">Escala al ancho</option>
            <option value="OBS_BOUNDS_SCALE_TO_HEIGHT">Escala al alto</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Ancho bounds</label>
          <input
            type="number"
            value={form.boundsWidth}
            onChange={(e) => set('boundsWidth', Number(e.target.value))}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Alto bounds</label>
          <input
            type="number"
            value={form.boundsHeight}
            onChange={(e) => set('boundsHeight', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button className="btn btn-primary" onClick={apply} disabled={!dirty}>
          Aplicar transform
        </button>
        {dirty && <span className="text-warning" style={{ fontSize: 12 }}>Cambios sin aplicar</span>}
      </div>
    </div>
  )
}

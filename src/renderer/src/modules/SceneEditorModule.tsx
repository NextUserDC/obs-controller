import { useState, useEffect, useRef, useCallback } from 'react'
import { useObsState } from '../stores/obsState'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { useConnection } from '../stores/connection'

interface ItemTransform {
  positionX: number
  positionY: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  sourceWidth: number
  sourceHeight: number
  rotation: number
}

interface EditorItem {
  sceneItemId: number
  sourceName: string
  sceneItemEnabled: boolean
  t: ItemTransform
}

type DragMode = 'move' | 'resize'

interface DragState {
  mode: DragMode
  itemId: number
  startPointerX: number
  startPointerY: number
  orig: ItemTransform
}

const DEFAULT_TRANSFORM: ItemTransform = {
  positionX: 0,
  positionY: 0,
  width: 0,
  height: 0,
  scaleX: 1,
  scaleY: 1,
  sourceWidth: 0,
  sourceHeight: 0,
  rotation: 0
}

export function SceneEditorModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const sceneList = useObsState((s) => s.sceneList)
  const currentProgramSceneName = useObsState((s) => s.currentProgramSceneName)
  const refreshSceneItems = useObsState((s) => s.refreshSceneItems)

  const [sceneName, setSceneName] = useState<string>('')
  const [items, setItems] = useState<EditorItem[]>([])
  const [baseSize, setBaseSize] = useState({ w: 1920, h: 1080 })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasPx, setCanvasPx] = useState({ w: 0, h: 0 })

  const dragRef = useRef<DragState | null>(null)
  const [dragItem, setDragItem] = useState<{ id: number; t: ItemTransform } | null>(null)

  useEffect(() => {
    if (!sceneName && currentProgramSceneName) setSceneName(currentProgramSceneName)
  }, [currentProgramSceneName, sceneName])

  const load = useCallback(async () => {
    if (!sceneName) return
    setLoading(true)
    const [info, list] = await Promise.all([
      tryCall<{ baseWidth: number; baseHeight: number }>('GetVideoInfo'),
      tryCall<{
        sceneItems: {
          sceneItemId: number
          sourceName: string
          sceneItemEnabled: boolean
          sceneItemTransform: Partial<ItemTransform>
        }[]
      }>('GetSceneItemList', { sceneName })
    ])
    if (info?.baseWidth) setBaseSize({ w: info.baseWidth, h: info.baseHeight })
    if (list?.sceneItems) {
      const mapped: EditorItem[] = list.sceneItems.map((it) => ({
        sceneItemId: it.sceneItemId,
        sourceName: it.sourceName,
        sceneItemEnabled: it.sceneItemEnabled,
        t: { ...DEFAULT_TRANSFORM, ...(it.sceneItemTransform as ItemTransform) }
      }))

      setItems(mapped)
    }
    setLoading(false)
  }, [sceneName])

  useEffect(() => {
    if (connected && sceneName) void load()
  }, [connected, sceneName, load])

  useEffect(() => {
    const measure = (): void => {
      const el = canvasRef.current
      if (el) setCanvasPx({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [items.length])

  const pxToCanvas = useCallback(
    (dx: number, dy: number): { dx: number; dy: number } => {
      const sx = canvasPx.w ? baseSize.w / canvasPx.w : 1
      const sy = canvasPx.h ? baseSize.h / canvasPx.h : 1
      return { dx: dx * sx, dy: dy * sy }
    },
    [canvasPx, baseSize]
  )

  const beginDrag = (e: React.MouseEvent, item: EditorItem, mode: DragMode): void => {
    e.stopPropagation()
    setSelectedId(item.sceneItemId)
    dragRef.current = {
      mode,
      itemId: item.sceneItemId,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      orig: item.t
    }
    setDragItem({ id: item.sceneItemId, t: item.t })
  }

  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      const d = dragRef.current
      if (!d) return
      const rawDx = e.clientX - d.startPointerX
      const rawDy = e.clientY - d.startPointerY
      const { dx, dy } = pxToCanvas(rawDx, rawDy)
      let t: ItemTransform
      if (d.mode === 'move') {
        t = { ...d.orig, positionX: d.orig.positionX + dx, positionY: d.orig.positionY + dy }
      } else {

        const newW = Math.max(2, d.orig.width + dx)
        const newH = Math.max(2, d.orig.height + dy)
        const scaleX = d.orig.sourceWidth ? newW / d.orig.sourceWidth : d.orig.scaleX
        const scaleY = d.orig.sourceHeight ? newH / d.orig.sourceHeight : d.orig.scaleY
        t = { ...d.orig, width: newW, height: newH, scaleX, scaleY }
      }
      setDragItem({ id: d.itemId, t })
    }
    const onUp = (): void => {
      const d = dragRef.current
      const cur = dragItem
      dragRef.current = null
      setDragItem(null)
      if (!d || !cur || cur.id !== d.itemId) return
      const t = cur.t
      const payload =
        d.mode === 'move'
          ? { positionX: t.positionX, positionY: t.positionY }
          : { scaleX: t.scaleX, scaleY: t.scaleY }

      setItems((prev) =>
        prev.map((it) => (it.sceneItemId === d.itemId ? { ...it, t: { ...it.t, ...payload } } : it))
      )
      void call('SetSceneItemTransform', {
        sceneName,
        sceneItemId: d.itemId,
        sceneItemTransform: payload
      }).catch(() => void load())
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragItem, pxToCanvas, sceneName, load])

  const setNumeric = async (field: keyof ItemTransform, value: number): Promise<void> => {
    if (selectedId == null) return
    const item = items.find((i) => i.sceneItemId === selectedId)
    if (!item) return
    const t = { ...item.t, [field]: value }

    if (field === 'scaleX' && item.t.sourceWidth) t.width = item.t.sourceWidth * value
    if (field === 'scaleY' && item.t.sourceHeight) t.height = item.t.sourceHeight * value
    setItems((prev) => prev.map((it) => (it.sceneItemId === selectedId ? { ...it, t } : it)))
    const payload: Record<string, number> =
      field === 'width' && item.t.sourceWidth
        ? { scaleX: value / item.t.sourceWidth }
        : field === 'height' && item.t.sourceHeight
          ? { scaleY: value / item.t.sourceHeight }
          : { [field]: value }
    await call('SetSceneItemTransform', {
      sceneName,
      sceneItemId: selectedId,
      sceneItemTransform: payload
    }).catch(() => void load())
  }

  const toggleVisible = async (item: EditorItem): Promise<void> => {
    const next = !item.sceneItemEnabled
    setItems((prev) =>
      prev.map((it) =>
        it.sceneItemId === item.sceneItemId ? { ...it, sceneItemEnabled: next } : it
      )
    )
    await call('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: next
    }).catch(() => void load())
    refreshSceneItems(sceneName)
  }

  if (!connected) return <NotConnected />

  const selected = items.find((i) => i.sceneItemId === selectedId) ?? null
  const ratio = baseSize.h / baseSize.w

  return (
    <div className="panel">
      <div className="panel-header">
        <span>🎨 Editor de escena (arrastra y redimensiona)</span>
        <div className="btn-group">
          <select
            value={sceneName}
            onChange={(e) => {
              setSceneName(e.target.value)
              setSelectedId(null)
            }}
          >
            {sceneList.map((s) => (
              <option key={s.sceneName} value={s.sceneName}>
                {s.sceneName}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Cargando…' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      <div className="editor-layout">

        <div className="editor-canvas-wrap">
          <div
            ref={canvasRef}
            className="editor-canvas"
            style={{ aspectRatio: `${baseSize.w} / ${baseSize.h}` }}
            onClick={() => setSelectedId(null)}
          >
            {items.map((it) => {
              const t = dragItem && dragItem.id === it.sceneItemId ? dragItem.t : it.t
              const left = (t.positionX / baseSize.w) * 100
              const top = (t.positionY / baseSize.h) * 100
              const width = (t.width / baseSize.w) * 100
              const height = (t.height / baseSize.h) * 100
              return (
                <div
                  key={it.sceneItemId}
                  className={`editor-item ${selectedId === it.sceneItemId ? 'selected' : ''} ${
                    it.sceneItemEnabled ? '' : 'hidden-item'
                  }`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined
                  }}
                  onMouseDown={(e) => beginDrag(e, it, 'move')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="editor-item-label">{it.sourceName}</span>
                  <div
                    className="editor-resize-handle"
                    onMouseDown={(e) => beginDrag(e, it, 'resize')}
                  />
                </div>
              )
            })}
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
            Lienzo {baseSize.w}×{baseSize.h} — arrastra para mover, usa la esquina ↘ para
            redimensionar. Clic fuera para deseleccionar.
          </div>
        </div>

        <div className="editor-side">
          {selected ? (
            <>
              <div className="editor-side-title">{selected.sourceName}</div>
              <label className="editor-side-row">
                <span>X</span>
                <input
                  type="number"
                  value={Math.round(selected.t.positionX)}
                  onChange={(e) => void setNumeric('positionX', Number(e.target.value))}
                />
              </label>
              <label className="editor-side-row">
                <span>Y</span>
                <input
                  type="number"
                  value={Math.round(selected.t.positionY)}
                  onChange={(e) => void setNumeric('positionY', Number(e.target.value))}
                />
              </label>
              <label className="editor-side-row">
                <span>Ancho</span>
                <input
                  type="number"
                  value={Math.round(selected.t.width)}
                  onChange={(e) => void setNumeric('width', Number(e.target.value))}
                />
              </label>
              <label className="editor-side-row">
                <span>Alto</span>
                <input
                  type="number"
                  value={Math.round(selected.t.height)}
                  onChange={(e) => void setNumeric('height', Number(e.target.value))}
                />
              </label>
              <label className="editor-side-row">
                <span>Rotación °</span>
                <input
                  type="number"
                  value={Math.round(selected.t.rotation)}
                  onChange={(e) => void setNumeric('rotation', Number(e.target.value))}
                />
              </label>
              <button className="btn btn-sm" onClick={() => void toggleVisible(selected)}>
                {selected.sceneItemEnabled ? '👁️ Ocultar' : '🚫 Mostrar'}
              </button>
            </>
          ) : (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Selecciona un elemento en el lienzo para editar su posición, tamaño y rotación con
              valores exactos.
            </div>
          )}

          <div className="editor-item-list">
            {items.map((it) => (
              <button
                key={it.sceneItemId}
                className={`editor-item-list-row ${selectedId === it.sceneItemId ? 'active' : ''}`}
                onClick={() => setSelectedId(it.sceneItemId)}
              >
                <span className={it.sceneItemEnabled ? '' : 'text-muted'}>{it.sourceName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

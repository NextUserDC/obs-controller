import { useState } from 'react'
import { useObsState } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'

export function HotkeysModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const hotkeyList = useObsState((s) => s.hotkeyList)
  const [filter, setFilter] = useState('')
  const [lastFired, setLastFired] = useState<string | null>(null)

  if (!connected) return <NotConnected what="las hotkeys" />

  const filtered = hotkeyList.filter((name) =>
    String(name).toLowerCase().includes(filter.toLowerCase())
  )

  const fire = async (hotkeyName: string): Promise<void> => {

    await call('TriggerHotkeyByName', { hotkeyName }).then(
      () => setLastFired(hotkeyName),
      () => {}
    )
    setTimeout(() => setLastFired(null), 1500)
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>⌨️ Hotkeys de OBS ({hotkeyList.length})</span>
          <input
            type="text"
            placeholder="Filtrar hotkeys…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '4px 10px',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: 12,
              width: 220
            }}
          />
        </div>
        <div className="panel-body">
          <div className="list" style={{ maxHeight: 500 }}>
            {filtered.map((name, i) => (
              <div key={`${name}-${i}`} className="list-item">
                <span className="item-name mono">{name}</span>
                {lastFired === name && (
                  <span className="item-badge badge-preview">DISPARADA ✓</span>
                )}
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => fire(String(name))}
                >
                  ▶ Ejecutar
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-muted" style={{ padding: 12 }}>
                {filter ? 'Ninguna hotkey coincide con el filtro.' : 'No hay hotkeys disponibles.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>🎯 Secuencia de teclas personalizada</span>
        </div>
        <div className="panel-body">
          <CustomKeySequence />
        </div>
      </div>
    </div>
  )
}

function CustomKeySequence() {
  const [keys, setKeys] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const [fired, setFired] = useState(false)

  const startRecording = (): void => {
    setKeys([])
    setRecording(true)
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault()
      const parts: string[] = []
      if (e.ctrlKey) parts.push('CTRL')
      if (e.altKey) parts.push('ALT')
      if (e.shiftKey) parts.push('SHIFT')
      if (e.metaKey) parts.push('META')
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
        setKeys(parts)
        setRecording(false)
        window.removeEventListener('keydown', handler, true)
      } else {
        setKeys(parts)
      }
    }
    window.addEventListener('keydown', handler, true)
  }

  const fire = async (): Promise<void> => {
    if (keys.length === 0) return

    const modifiers = keys.slice(0, -1)
    const keyModifiers = {
      shift: modifiers.includes('SHIFT'),
      control: modifiers.includes('CTRL'),
      alt: modifiers.includes('ALT'),
      meta: modifiers.includes('META')
    }
    await call('TriggerHotkeyByKeySequence', {
      keyId: keys[keys.length - 1],
      keyModifiers,
      keyPress: true
    }).then(
      () => {
        setFired(true)
        setTimeout(() => setFired(false), 1500)
      },
      () => {}
    )
  }

  return (
    <div>
      <div className="text-muted mb-2" style={{ fontSize: 12 }}>
        Graba una combinación de teclas (ej. Ctrl+Shift+F1) y dispara esa secuencia en el PC con
        OBS, como si la hubieras pulsado allí.
      </div>
      <div className="flex gap-2 items-center">
        <button className={`btn ${recording ? 'btn-danger' : ''}`} onClick={startRecording}>
          {recording ? '⏺ Escuchando… pulsa la combinación' : '⏺ Grabar combinación'}
        </button>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
          {keys.length > 0 ? keys.join(' + ') : '—'}
        </span>
        {fired && <span className="text-success">DISPARADA ✓</span>}
        <button className="btn btn-primary" onClick={fire} disabled={keys.length === 0 || recording}>
          ▶ Ejecutar secuencia
        </button>
      </div>
    </div>
  )
}

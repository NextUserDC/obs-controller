import { useEffect, useState } from 'react'
import { useObsState, type FilterEntry } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Toggle } from '../components/Toggle'

const FILTER_KINDS = [
  { kind: 'crop_filter', label: 'Crop/Pad' },
  { kind: 'color_filter_v2', label: 'Corrección de color' },
  { kind: 'chroma_key_filter', label: 'Chroma Key (croma)' },
  { kind: 'luma_key_filter', label: 'Luma Key' },
  { kind: 'sharpness_filter', label: 'Nitidez' },
  { kind: 'scroll_filter', label: 'Scroll (desplazamiento)' },
  { kind: 'img_color_correction', label: 'Corrección de imagen' },
  { kind: 'scale_filter', label: 'Escala/Resample' },
  { kind: 'color_key_filter', label: 'Color Key' },
  { kind: 'premultiplied_alpha_filter', label: 'Alpha pre-multiplicado' },
  { kind: 'clut_filter', label: 'LUT (CLUT)' },
  { kind: 'mask_filter_v2', label: 'Máscara (imagen)' },
  { kind: 'audio_delay_filter', label: 'Delay de audio' },
  { kind: 'audio_gain_filter', label: 'Gain de audio' },
  { kind: 'compositor_filter', label: 'Compositor' },
  { kind: 'noise_gate_filter', label: 'Noise Gate (audio)' },
  { kind: 'noise_suppress_filter', label: 'Supresión de ruido' },
  { kind: 'limiter_filter', label: 'Limiter (audio)' },
  { kind: 'expander_filter', label: 'Expander (audio)' }
]

export function FiltersModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { inputList, filtersByInput, refreshFilters } = useObsState()
  const [selectedInput, setSelectedInput] = useState<string | null>(null)
  const [newKind, setNewKind] = useState('crop_filter')
  const [newName, setNewName] = useState('')
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)

  const filters = selectedInput ? (filtersByInput[selectedInput] ?? []) : []

  useEffect(() => {
    if (selectedInput) refreshFilters(selectedInput)
  }, [selectedInput, refreshFilters])

  if (!connected) return <NotConnected what="los filtros" />

  const createFilter = async (): Promise<void> => {
    if (!selectedInput || !newName.trim()) return
    await call('CreateSourceFilter', {
      sourceName: selectedInput,
      filterName: newName.trim(),
      filterKind: newKind,
      filterSettings: {}
    }).catch((e) => alert(`Error: ${e.message}`))
    setNewName('')
    refreshFilters(selectedInput)
  }

  const removeFilter = async (filter: FilterEntry): Promise<void> => {
    if (!selectedInput) return
    if (!window.confirm(`¿Eliminar el filtro "${filter.filterName}"?`)) return
    await call('RemoveSourceFilter', {
      sourceName: selectedInput,
      filterName: filter.filterName
    }).catch(() => {})
    refreshFilters(selectedInput)
  }

  const toggleFilter = async (filter: FilterEntry, enabled: boolean): Promise<void> => {
    if (!selectedInput) return
    await call('SetSourceFilterEnabled', {
      sourceName: selectedInput,
      filterName: filter.filterName,
      filterEnabled: enabled
    }).catch(() => {})
    refreshFilters(selectedInput)
  }

  const moveFilter = async (filter: FilterEntry, dir: -1 | 1): Promise<void> => {
    if (!selectedInput) return
    const newIndex = filter.filterIndex + dir
    if (newIndex < 0 || newIndex >= filters.length) return
    await call('SetSourceFilterIndex', {
      sourceName: selectedInput,
      filterName: filter.filterName,
      filterIndex: newIndex
    }).catch(() => {})
    refreshFilters(selectedInput)
  }

  const selectedFilter = filters.find((f) => f.filterId === selectedFilterId) ?? null

  return (
    <div>
      <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr' }}>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <span>🖥️ Fuente</span>
          </div>
          <div className="panel-body">
            <div className="list">
              {inputList.map((input) => (
                <div
                  key={input.inputUuid}
                  className={`list-item ${selectedInput === input.inputName ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedInput(input.inputName)
                    setSelectedFilterId(null)
                  }}
                >
                  <span className="item-name">{input.inputName}</span>
                  <span className="item-badge">
                    {(filtersByInput[input.inputName]?.length ?? 0)} filtros
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <span>🎚️ Filtros {selectedInput ? `de «${selectedInput}»` : ''}</span>
          </div>
          <div className="panel-body">
            {!selectedInput ? (
              <div className="text-muted" style={{ padding: 24, textAlign: 'center' }}>
                Selecciona una fuente para gestionar sus filtros.
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nombre del filtro"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createFilter()}
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
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)'
                    }}
                  >
                    {FILTER_KINDS.map((k) => (
                      <option key={k.kind} value={k.kind}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={createFilter} disabled={!newName.trim()}>
                    + Añadir
                  </button>
                </div>

                <div className="list">
                  {filters.map((filter) => (
                    <div
                      key={filter.filterId}
                      className={`list-item ${selectedFilterId === filter.filterId ? 'selected' : ''}`}
                      onClick={() => setSelectedFilterId(filter.filterId)}
                    >
                      <Toggle
                        checked={filter.filterEnabled}
                        onChange={(v) => toggleFilter(filter, v)}
                      />
                      <span className="item-name">{filter.filterName}</span>
                      <span className="item-badge">
                        {filter.filterKind.replace('_filter', '').replace('_v2', '')}
                      </span>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-icon" onClick={() => moveFilter(filter, 1)}>
                          ▲
                        </button>
                        <button className="btn btn-sm btn-icon" onClick={() => moveFilter(filter, -1)}>
                          ▼
                        </button>
                        <button
                          className="btn btn-sm btn-icon btn-danger"
                          onClick={() => removeFilter(filter)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {filters.length === 0 && (
                    <div className="text-muted" style={{ padding: 12 }}>
                      Esta fuente no tiene filtros.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedFilter && selectedInput && (
        <div className="panel">
          <div className="panel-header">
            <span>⚙️ Ajustes del filtro «{selectedFilter.filterName}»</span>
          </div>
          <div className="panel-body">
            <FilterSettingsEditor
              sourceName={selectedInput}
              filter={selectedFilter}
              onSaved={() => refreshFilters(selectedInput)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function FilterSettingsEditor({
  sourceName,
  filter,
  onSaved
}: {
  sourceName: string
  filter: FilterEntry
  onSaved: () => void
}) {
  const [raw, setRaw] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await tryCall<{ filterSettings: Record<string, unknown> }>('GetSourceFilter', {
        sourceName,
        filterName: filter.filterName
      })
      if (!cancelled) {
        setRaw(JSON.stringify(res?.filterSettings ?? filter.filterSettings ?? {}, null, 2))
        setDirty(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sourceName, filter.filterName, filter.filterSettings])

  const apply = async (): Promise<void> => {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      await call('SetSourceFilterSettings', {
        sourceName,
        filterName: filter.filterName,
        filterSettings: parsed
      })
      setDirty(false)
      onSaved()
    } catch (e) {
      alert(`JSON inválido: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value)
          setDirty(true)
        }}
        rows={12}
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
        <button className="btn btn-primary" onClick={apply} disabled={!dirty}>
          Aplicar ajustes
        </button>
      </div>
    </div>
  )
}

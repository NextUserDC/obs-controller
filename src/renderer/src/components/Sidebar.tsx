export type ModuleId =
  | 'scenes'
  | 'inputs'
  | 'audio'
  | 'sceneEditor'
  | 'sceneItems'
  | 'filters'
  | 'transitions'
  | 'streaming'
  | 'recording'
  | 'replayVcam'
  | 'outputs'
  | 'hotkeys'
  | 'stats'
  | 'console'
  | 'settings'

interface SidebarProps {
  active: ModuleId
  onChange: (id: ModuleId) => void
  connected: boolean
}

const NAV_MAIN: { id: ModuleId; icon: string; label: string }[] = [
  { id: 'scenes', icon: '🎬', label: 'Escenas y Estudio' },
  { id: 'inputs', icon: '🖥️', label: 'Fuentes (Inputs)' },
  { id: 'audio', icon: '🎚️', label: 'Mezclador de Audio' },
  { id: 'sceneEditor', icon: '🎨', label: 'Editor de Escena' },
  { id: 'sceneItems', icon: '🧩', label: 'Elementos de Escena' },
  { id: 'filters', icon: '🎚️', label: 'Filtros' },
  { id: 'transitions', icon: '🔄', label: 'Transiciones' }
]

const NAV_OUTPUT: { id: ModuleId; icon: string; label: string }[] = [
  { id: 'streaming', icon: '📡', label: 'Streaming' },
  { id: 'recording', icon: '⏺️', label: 'Grabación' },
  { id: 'replayVcam', icon: '🎞️', label: 'Replay + VCAM' },
  { id: 'outputs', icon: '📤', label: 'Salidas (Outputs)' }
]

const NAV_ADV: { id: ModuleId; icon: string; label: string }[] = [
  { id: 'hotkeys', icon: '⌨️', label: 'Hotkeys' },
  { id: 'stats', icon: '📊', label: 'Stats y Eventos' },
  { id: 'console', icon: '💻', label: 'Consola JSON' }
]

const NAV_SYS: { id: ModuleId; icon: string; label: string }[] = [
  { id: 'settings', icon: '⚙️', label: 'Configuración' }
]

export function Sidebar({ active, onChange, connected }: SidebarProps) {
  const renderItem = (item: { id: ModuleId; icon: string; label: string }): React.JSX.Element => (
    <div
      key={item.id}
      className={`sidebar-item ${active === item.id ? 'active' : ''}`}
      onClick={() => onChange(item.id)}
      style={!connected && item.id !== 'settings' && item.id !== 'console' ? { opacity: 0.5 } : undefined}
    >
      <span className="item-icon">{item.icon}</span>
      {item.label}
    </div>
  )

  return (
    <div className="sidebar">
      <div className="sidebar-section">Control</div>
      {NAV_MAIN.map(renderItem)}
      <div className="sidebar-section">Salidas</div>
      {NAV_OUTPUT.map(renderItem)}
      <div className="sidebar-section">Avanzado</div>
      {NAV_ADV.map(renderItem)}
      <div className="sidebar-section">Sistema</div>
      {NAV_SYS.map(renderItem)}
    </div>
  )
}

interface NotConnectedProps {
  what?: string
}

export function NotConnected({ what = 'este módulo' }: NotConnectedProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🔌</div>
      <div className="empty-title">Sin conexión a OBS</div>
      <div className="empty-desc">
        Conéctate a un servidor OBS WebSocket para usar {what}. Haz clic en el indicador de
        conexión en la barra superior.
      </div>
    </div>
  )
}

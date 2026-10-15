import { useToast } from '../stores/toast'

const ICONS: Record<string, string> = {
  error: '⛔',
  success: '✅',
  info: 'ℹ️'
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <div className="toast-body">
            <div className="toast-message">{t.message}</div>
            {t.detail && <div className="toast-detail mono">{t.detail}</div>}
          </div>
          <button className="toast-close" onClick={() => dismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

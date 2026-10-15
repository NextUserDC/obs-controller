interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <div
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>
      {label && <span>{label}</span>}
    </div>
  )
}

interface LedProps {
  color: 'green' | 'red' | 'yellow' | 'gray' | 'blue'
  pulse?: boolean
}

export function Led({ color, pulse }: LedProps) {
  return (
    <span
      className={`led led-${color}`}
      style={pulse ? { animation: 'pulse-live 1.6s infinite' } : undefined}
    />
  )
}

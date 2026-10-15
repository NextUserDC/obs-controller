import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('[ErrorBoundary]', error, info.componentStack ?? '')
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="panel" style={{ margin: 16 }}>
          <div className="panel-header">
            <span>⚠️ Este módulo encontró un error</span>
          </div>
          <div className="panel-body">
            <div className="text-muted mb-2" style={{ fontSize: 12.5 }}>
              La app siguió funcionando; solo este módulo falló.
            </div>
            <pre
              className="mono"
              style={{
                fontSize: 11.5,
                color: 'var(--danger)',
                whiteSpace: 'pre-wrap',
                margin: '0 0 12px'
              }}
            >
              {this.state.error.message}
            </pre>
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

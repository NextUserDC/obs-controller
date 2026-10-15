import { useObsState, type OutputEntry } from '../stores/obsState'
import { useConnection } from '../stores/connection'
import { call, tryCall } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'
import { Led } from '../components/Led'

export function OutputsModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const { outputList } = useObsState()

  if (!connected) return <NotConnected what="las salidas (outputs)" />

  const refresh = async (): Promise<void> => {
    const res = await tryCall<{ outputs: OutputEntry[] }>('GetOutputList')
    if (res) useObsState.setState({ outputList: res.outputs })
  }

  const toggleOutput = async (o: OutputEntry): Promise<void> => {
    await call(o.outputActive ? 'StopOutput' : 'StartOutput', { outputName: o.outputName }).catch(
      (e) => alert(`Error en «${o.outputName}»: ${e.message}`)
    )
    refresh()
  }

  const openSettingsDialog = async (o: OutputEntry): Promise<void> => {
    const res = await tryCall<{ outputSettings: Record<string, unknown> }>('GetOutputSettings', {
      outputName: o.outputName
    })
    const raw = JSON.stringify(res?.outputSettings ?? {}, null, 2)
    const edited = window.prompt(`Ajustes de «${o.outputName}» (JSON):`, raw)
    if (edited == null) return
    try {
      const parsed = JSON.parse(edited) as Record<string, unknown>
      await call('SetOutputSettings', { outputName: o.outputName, outputSettings: parsed })
      refresh()
    } catch (e) {
      alert(`JSON inválido: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span>📤 Salidas de OBS ({outputList.length})</span>
          <button className="btn btn-sm" onClick={refresh}>
            🔄 Actualizar
          </button>
        </div>
        <div className="panel-body">
          <table className="table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th style={{ width: 260 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {outputList.map((o) => (
                <tr key={o.outputUuid}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Led color={o.outputActive ? 'green' : 'gray'} />
                      {o.outputActive ? 'Activa' : 'Inactiva'}
                    </div>
                  </td>
                  <td>{o.outputName}</td>
                  <td>
                    <span className="item-badge mono">{o.outputKind}</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className={`btn btn-sm ${o.outputActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleOutput(o)}
                      >
                        {o.outputActive ? 'Detener' : 'Iniciar'}
                      </button>
                      <button className="btn btn-sm" onClick={() => openSettingsDialog(o)}>
                        Ajustes…
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {outputList.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                    No se detectaron salidas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>🪟 Abrir ventanas de OBS</span>
        </div>
        <div className="panel-body">
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => call('OpenInputPropertiesDialog', { inputName: '' }).catch(() => {})}
              title="Requiere seleccionar fuente en el módulo Fuentes"
            >
              Propiedades de fuente…
            </button>
            <button
              className="btn"
              onClick={() => call('OpenInputInteractDialog', { inputName: '' }).catch(() => {})}
              title="Interactuar con una fuente (ej. navegador)"
            >
              Interactuar con fuente…
            </button>
            <button
              className="btn"
              onClick={() =>
                call('OpenVideoMixProjector', { videoMixType: 'OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM' }).catch(
                  () => {}
                )
              }
            >
              Projector de programa
            </button>
            <button
              className="btn"
              onClick={() =>
                call('OpenVideoMixProjector', { videoMixType: 'OBS_WEBSOCKET_VIDEO_MIX_TYPE_PREVIEW' }).catch(
                  () => {}
                )
              }
            >
              Projector de preview
            </button>
            <button
              className="btn"
              onClick={() => call('OpenSourceProjector', { sourceName: '' }).catch(() => {})}
            >
              Projector de fuente…
            </button>
            <button className="btn" onClick={() => call('OpenMainWindow', { program: true }).catch(() => {})}>
              Traer OBS al frente
            </button>
          </div>
          <div className="text-muted mt-2" style={{ fontSize: 11.5 }}>
            Para los diálogos que requieren nombre de fuente, usa la Consola JSON con
            OpenInputPropertiesDialog / OpenInputInteractDialog e indica inputName.
          </div>
        </div>
      </div>
    </div>
  )
}

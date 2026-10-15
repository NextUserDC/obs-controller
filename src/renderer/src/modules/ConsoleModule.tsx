import { useState } from 'react'
import { useConnection } from '../stores/connection'
import { obs } from '../lib/obs'
import { NotConnected } from '../components/NotConnected'

const EXAMPLE_REQUESTS = [
  { type: 'GetVersion', data: '{}' },
  { type: 'GetStats', data: '{}' },
  { type: 'GetSceneList', data: '{}' },
  { type: 'GetInputList', data: '{}' },
  { type: 'GetSourceFilterList', data: '{"sourceName": "NombreDeFuente"}' },
  { type: 'CallVendorRequest', data: '{"vendorName": "", "requestType": "", "requestData": {}}' },
  { type: 'GetHotkeyList', data: '{}' },
  { type: 'GetMonitorList', data: '{}' },
  { type: 'GetStreamServiceSettings', data: '{}' },
  { type: 'GetOutputList', data: '{}' },
  { type: 'SetSceneItemTransform', data: '{"sceneName": "Escena", "sceneItemId": 1, "sceneItemTransform": {"positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1}}' },
  { type: 'SetSceneName', data: '{"sceneName": "EscenaVieja", "newSceneName": "EscenaNueva"}' },
  { type: 'SetInputName', data: '{"inputName": "FuenteVieja", "newInputName": "FuenteNueva"}' }
]

export function ConsoleModule() {
  const connected = useConnection((s) => s.status.state === 'connected')
  const [requestType, setRequestType] = useState('GetVersion')
  const [requestData, setRequestData] = useState('{}')
  const [output, setOutput] = useState('// La respuesta del servidor aparecerá aquí…')
  const [busy, setBusy] = useState(false)

  const send = async (): Promise<void> => {
    if (!connected) return
    setBusy(true)
    try {
      const parsed = requestData.trim() ? (JSON.parse(requestData) as Record<string, unknown>) : {}
      const res = await obs.callRequest(requestType.trim(), parsed)
      setOutput(JSON.stringify(res, null, 2))
    } catch (e) {
      setOutput(`ERROR: ${(e as Error).message}\n\nRequest: ${requestType}\nData: ${requestData}`)
    } finally {
      setBusy(false)
    }
  }

  if (!connected) return <NotConnected what="la consola JSON" />

  return (
    <div className="json-console">
      <div>
        <div className="text-muted mb-2" style={{ fontSize: 12 }}>
          Envía cualquier <strong>request del protocolo obs-websocket v5</strong> en crudo. Útil
          para functions sin botón dedicado y para <strong>vendor requests</strong> de plugins
          (StreamFX, Advanced Scene Switcher, etc.).
        </div>
        <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
          {EXAMPLE_REQUESTS.map((ex) => (
            <button
              key={ex.type}
              className="btn btn-sm"
              onClick={() => {
                setRequestType(ex.type)
                setRequestData(ex.data)
              }}
            >
              {ex.type}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Request Type</label>
        <input
          type="text"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="mono"
        />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Request Data (JSON)</label>
        <textarea
          value={requestData}
          onChange={(e) => setRequestData(e.target.value)}
          rows={6}
          className="mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
          }}
        />
      </div>

      <button className="btn btn-primary" onClick={send} disabled={busy} style={{ alignSelf: 'flex-start' }}>
        {busy && <span className="spinner" />} ▶ Enviar request (Ctrl+Enter)
      </button>

      <div className="field" style={{ marginBottom: 0, flex: 1 }}>
        <label>Respuesta</label>
        <div className="json-console-output">{output}</div>
      </div>
    </div>
  )
}

import { useConnection } from '../stores/connection'
import { useObsState } from '../stores/obsState'
import { call } from '../lib/obs'
import { Led } from './Led'

async function callAndRefresh(
  requestType: string,
  requestData?: Record<string, unknown>
): Promise<void> {
  try {
    await call(requestType, requestData)
  } catch {

  }
  await useObsState.getState().refreshOutputStatus()
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function parseTimecode(tc: unknown): number {
  if (typeof tc !== 'string') return 0

  const match = tc.match(/(\d+):(\d+):(\d+)/)
  if (!match) return 0
  return (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000
}

export function Toolbar() {
  const { status, setConnectDialogOpen, platform } = useConnection()
  const {
    streamStatus,
    recordStatus,
    replayStatus,
    virtualCamStatus,
    studioModeEnabled,
    currentTransitionName,
    currentProgramSceneName
  } = useObsState()

  const connected = status.state === 'connected'
  const streamActive = streamStatus?.outputActive ?? false
  const recordActive = recordStatus?.outputActive ?? false
  const recordPaused = recordStatus?.outputPaused ?? false
  const replayActive = replayStatus?.outputActive ?? false
  const vcamActive = virtualCamStatus?.outputActive ?? false

  const connClass =
    status.state === 'connected'
      ? 'connected'
      : status.state === 'error'
        ? 'error'
        : status.state === 'connecting' || status.state === 'reconnecting'
          ? 'connecting'
          : ''

  const connText =
    status.state === 'connected'
      ? `Conectado · OBS ${status.obsVersion}`
      : status.state === 'connecting'
        ? 'Conectando…'
        : status.state === 'reconnecting'
          ? `Reconectando (${status.attempt})…`
          : status.state === 'error'
            ? 'Error de conexión'
            : 'Desconectado'

  const connLed =
    status.state === 'connected'
      ? 'green'
      : status.state === 'error'
        ? 'red'
        : status.state === 'connecting' || status.state === 'reconnecting'
          ? 'yellow'
          : 'gray'

  const toggleStudioMode = async (): Promise<void> => {
    if (!connected) return
    try {
      await call('SetStudioModeEnabled', { studioModeEnabled: !studioModeEnabled })
    } catch {

    }
  }

  const doStudioTransition = async (): Promise<void> => {
    if (!connected) return
    try {
      await call('TriggerStudioModeTransition')
    } catch {

    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <div className="brand-icon">O</div>
        OBS Controller
      </div>
      <div className="toolbar-divider" />

      <div
        className={`conn-badge ${connClass}`}
        onClick={() => setConnectDialogOpen(true)}
        title="Click para configurar conexión"
      >
        <Led color={connLed as 'green' | 'red' | 'yellow' | 'gray'} />
        {connText}
      </div>

      {connected && (
        <>
          <div className="toolbar-divider" />

          <div
            className="conn-badge"
            style={{ cursor: 'default' }}
            title="Escena de programa actual"
          >
            <Led color="red" />
            {currentProgramSceneName ?? '—'}
          </div>

          <button
            className={`btn btn-sm ${studioModeEnabled ? 'btn-primary' : ''}`}
            onClick={toggleStudioMode}
            title="Alternar modo estudio"
          >
            🎬 Estudio {studioModeEnabled ? 'ON' : 'OFF'}
          </button>

          {studioModeEnabled && (
            <button className="btn btn-sm" onClick={doStudioTransition} title="Transición de estudio">
              ➜ Transición
            </button>
          )}

          {currentTransitionName && (
            <span className="text-muted" style={{ fontSize: 11.5 }}>
              Transición: {currentTransitionName}
            </span>
          )}

          <div className="toolbar-spacer" />

          <button
            className={`btn btn-live ${streamActive ? 'active' : ''}`}
            disabled={!connected}
            onClick={() => callAndRefresh(streamActive ? 'StopStream' : 'StartStream')}
            title={streamActive ? 'Detener transmisión' : 'Iniciar transmisión'}
          >
            <Led color={streamActive ? 'red' : 'gray'} pulse={streamActive} />
            {streamActive
              ? `EN VIVO ${formatDuration(parseTimecode(streamStatus?.outputTimecode))}`
              : 'INICIAR LIVE'}
          </button>

          <button
            className={`btn ${recordActive ? 'btn-danger' : ''}`}
            disabled={!connected}
            onClick={() => callAndRefresh(recordActive ? 'StopRecord' : 'StartRecord')}
            title={recordActive ? 'Detener grabación' : 'Iniciar grabación'}
          >
            <Led color={recordActive ? 'red' : 'gray'} />
            {recordActive
              ? recordPaused
                ? 'GRAB. PAUSADA'
                : `REC ${formatDuration(parseTimecode(recordStatus?.outputTimecode))}`
              : 'GRABAR'}
          </button>

          {recordActive && (
            <button
              className="btn btn-sm"
              disabled={!connected}
              onClick={() =>
                callAndRefresh(recordPaused ? 'ResumeRecord' : 'PauseRecord')
              }
            >
              {recordPaused ? '▶ Reanudar' : '⏸ Pausar'}
            </button>
          )}

          <button
            className={`btn btn-sm ${replayActive ? 'btn-success' : ''}`}
            disabled={!connected}
            onClick={() =>
              callAndRefresh(replayActive ? 'StopReplayBuffer' : 'StartReplayBuffer')
            }
            title="Replay Buffer"
          >
            <Led color={replayActive ? 'green' : 'gray'} />
            Replay
          </button>

          {replayActive && (
            <button
              className="btn btn-sm"
              disabled={!connected}
              onClick={() => call('SaveReplayBuffer').catch(() => {})}
              title="Guardar replay"
            >
              💾
            </button>
          )}

          <button
            className={`btn btn-sm ${vcamActive ? 'btn-success' : ''}`}
            disabled={!connected}
            onClick={() => callAndRefresh(vcamActive ? 'StopVirtualCam' : 'StartVirtualCam')}
            title="Cámara virtual"
          >
            <Led color={vcamActive ? 'green' : 'gray'} />
            VCAM
          </button>
        </>
      )}

      <div className="toolbar-divider" />
      <span className="text-dim" style={{ fontSize: 11 }}>
        {platform === 'win32' ? '🪟' : platform === 'linux' ? '🐧' : '💻'} {platform}
      </span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useConnection } from './stores/connection'
import { useObsState } from './stores/obsState'
import { obs } from './lib/obs'
import { Toolbar } from './components/Toolbar'
import { Sidebar, type ModuleId } from './components/Sidebar'
import { ConnectDialog } from './components/ConnectDialog'
import { ScenesModule } from './modules/ScenesModule'
import { InputsModule } from './modules/InputsModule'
import { AudioModule } from './modules/AudioModule'
import { SceneEditorModule } from './modules/SceneEditorModule'
import { SceneItemsModule } from './modules/SceneItemsModule'
import { FiltersModule } from './modules/FiltersModule'
import { TransitionsModule } from './modules/TransitionsModule'
import { StreamingModule } from './modules/StreamingModule'
import { RecordingModule } from './modules/RecordingModule'
import { ReplayVcamModule } from './modules/ReplayVcamModule'
import { OutputsModule } from './modules/OutputsModule'
import { HotkeysModule } from './modules/HotkeysModule'
import { StatsModule } from './modules/StatsModule'
import { ConsoleModule } from './modules/ConsoleModule'
import { SettingsModule } from './modules/SettingsModule'
import { ToastContainer } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('scenes')
  const { init, setStatus, status, setConnectDialogOpen, initialized, connect } = useConnection()
  const connected = status.state === 'connected'

  useEffect(() => {
    init()
    const unsubStatus = obs.onStatus((s) => setStatus(s))
    const unsubEvent = obs.onEvent(({ eventType, eventData }) => {
      useObsState.getState().handleEvent(eventType, eventData)
    })
    return () => {
      unsubStatus()
      unsubEvent()
    }
  }, [init, setStatus])

  useEffect(() => {
    if (connected) {
      useObsState.getState().hydrate()
    }
  }, [connected])

  useEffect(() => {
    if (!connected) return
    const tick = (): void => {
      useObsState.getState().refreshOutputStatus()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [connected])

  useEffect(() => {
    if (!initialized) return
    let cancelled = false
    obs.getSavedConnection().then((saved) => {
      if (cancelled) return
      if (!saved) {
        setConnectDialogOpen(true)
      } else if (useConnection.getState().status.state === 'disconnected') {
        connect()
      }
    })
    return () => {
      cancelled = true
    }

  }, [initialized])

  const renderModule = (): React.JSX.Element | null => {
    switch (activeModule) {
      case 'scenes':
        return <ScenesModule />
      case 'inputs':
        return <InputsModule />
      case 'audio':
        return <AudioModule />
      case 'sceneEditor':
        return <SceneEditorModule />
      case 'sceneItems':
        return <SceneItemsModule />
      case 'filters':
        return <FiltersModule />
      case 'transitions':
        return <TransitionsModule />
      case 'streaming':
        return <StreamingModule />
      case 'recording':
        return <RecordingModule />
      case 'replayVcam':
        return <ReplayVcamModule />
      case 'outputs':
        return <OutputsModule />
      case 'hotkeys':
        return <HotkeysModule />
      case 'stats':
        return <StatsModule />
      case 'console':
        return <ConsoleModule />
      case 'settings':
        return <SettingsModule />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <Sidebar active={activeModule} onChange={setActiveModule} connected={connected} />
        <div className="main-content">
          <ErrorBoundary key={activeModule}>{renderModule()}</ErrorBoundary>
        </div>
      </div>
      <ConnectDialog />
      <ToastContainer />
    </div>
  )
}

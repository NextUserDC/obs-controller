import { create } from 'zustand'
import { tryCall } from '../lib/obs'

export interface SceneEntry {
  sceneName: string
  sceneIndex: number
}

export interface InputEntry {
  inputName: string
  inputUuid: string
  inputKind: string
  unversionedInputKind: string
}

export interface SceneItemEntry {
  sceneItemId: number
  sceneItemIndex: number
  sceneItemEnabled: boolean
  sceneItemLocked: boolean
  sceneItemBlendMode: string
  inputName?: string
  sourceName?: string
  isGroup?: boolean | null
  sceneItemTransform: Record<string, unknown>
}

export interface FilterEntry {
  filterEnabled: boolean
  filterId: string
  filterIndex: number
  filterKind: string
  filterName: string
  filterSettings: Record<string, unknown>
}

export interface TransitionEntry {
  transitionName: string
  transitionUuid: string
  transitionKind: string
  transitionFixed: boolean
}

export interface OutputEntry {
  outputName: string
  outputUuid: string
  outputKind: string
  outputActive: boolean
}

export interface StreamStatusData {
  outputActive: boolean
  outputReconnecting: boolean
  outputTimecode: string
  outputDuration: number
  outputCongestion: number
  outputBytes: number
  outputSkippedFrames: number
  outputTotalFrames: number
}

export interface RecordStatusData {
  outputActive: boolean
  outputPaused: boolean
  outputTimecode: string
  outputDuration: number
  outputBytes: number
}

export interface ReplayStatusData {
  outputActive: boolean
  outputTimecode: string
  outputDuration: number
  outputBytes: number
}

export interface VirtualCamStatusData {
  outputActive: boolean
  outputTimecode: string
  outputDuration: number
}

export interface ObsStatsData {
  cpuUsage: number
  memoryUsage: number
  availableDiskSpace: number
  activeFps: number
  frameSkippedFrames: number
  frameTotalFrames: number
  renderSkippedFrames: number
  renderTotalFrames: number
  outputSkippedFrames: number
  outputTotalFrames: number
  webSocketSessionIncomingMessages: number
  webSocketSessionOutgoingMessages: number
}

interface ObsState {

  currentProgramSceneName: string | null
  currentPreviewSceneName: string | null
  sceneList: SceneEntry[]

  studioModeEnabled: boolean

  transitionList: TransitionEntry[]
  currentTransitionName: string | null
  currentTransitionDuration: number | null

  inputList: InputEntry[]

  sceneItemList: SceneItemEntry[]

  filtersByInput: Record<string, FilterEntry[]>

  streamStatus: StreamStatusData | null

  recordStatus: RecordStatusData | null

  replayStatus: ReplayStatusData | null

  virtualCamStatus: VirtualCamStatusData | null

  outputList: OutputEntry[]

  hotkeyList: string[]

  stats: ObsStatsData | null

  eventLog: { id: number; time: string; eventType: string; eventData: Record<string, unknown> }[]

  hydrate: () => Promise<void>
  handleEvent: (eventType: string, eventData: Record<string, unknown>) => void
  refreshScenes: () => Promise<void>
  refreshInputs: () => Promise<void>
  refreshOutputStatus: () => Promise<void>
  refreshSceneItems: (sceneName?: string) => Promise<void>
  refreshFilters: (inputName: string) => Promise<void>
  clearEventLog: () => void
}

let eventIdCounter = 0
const MAX_EVENT_LOG = 500

export const useObsState = create<ObsState>((set, get) => ({
  currentProgramSceneName: null,
  currentPreviewSceneName: null,
  sceneList: [],
  studioModeEnabled: false,
  transitionList: [],
  currentTransitionName: null,
  currentTransitionDuration: null,
  inputList: [],
  sceneItemList: [],
  filtersByInput: {},
  streamStatus: null,
  recordStatus: null,
  replayStatus: null,
  virtualCamStatus: null,
  outputList: [],
  hotkeyList: [],
  stats: null,
  eventLog: [],

  hydrate: async () => {
    const [
      sceneListRes,
      programSceneRes,
      previewSceneRes,
      studioRes,
      transitionsRes,
      currentTransitionRes,
      inputsRes,
      streamStatusRes,
      recordStatusRes,
      replayStatusRes,
      vcamStatusRes,
      outputsRes,
      hotkeysRes,
      statsRes
    ] = await Promise.all([
      tryCall<{ scenes: SceneEntry[] }>('GetSceneList'),
      tryCall<{ currentProgramSceneName: string }>('GetCurrentProgramScene'),
      tryCall<{ currentPreviewSceneName: string }>('GetCurrentPreviewScene'),
      tryCall<{ studioModeEnabled: boolean }>('GetStudioModeEnabled'),
      tryCall<{ transitions: TransitionEntry[] }>('GetSceneTransitionList'),
      tryCall<{ transitionName: string; transitionDuration?: number }>('GetCurrentSceneTransition'),
      tryCall<{ inputs: InputEntry[] }>('GetInputList'),
      tryCall<StreamStatusData>('GetStreamStatus'),
      tryCall<RecordStatusData>('GetRecordStatus'),
      tryCall<ReplayStatusData>('GetReplayBufferStatus'),
      tryCall<VirtualCamStatusData>('GetVirtualCamStatus'),
      tryCall<{ outputs: OutputEntry[] }>('GetOutputList'),
      tryCall<{ hotkeys: string[] }>('GetHotkeyList'),
      tryCall<ObsStatsData>('GetStats')
    ])

    set({
      sceneList: sceneListRes?.scenes ?? [],
      currentProgramSceneName:
        programSceneRes?.currentProgramSceneName ??
        sceneListRes?.scenes[0]?.sceneName ??
        null,
      currentPreviewSceneName: previewSceneRes?.currentPreviewSceneName ?? null,
      studioModeEnabled: studioRes?.studioModeEnabled ?? false,
      transitionList: transitionsRes?.transitions ?? [],
      currentTransitionName: currentTransitionRes?.transitionName ?? null,
      currentTransitionDuration: currentTransitionRes?.transitionDuration ?? null,
      inputList: inputsRes?.inputs ?? [],
      streamStatus: streamStatusRes,
      recordStatus: recordStatusRes,
      replayStatus: replayStatusRes,
      virtualCamStatus: vcamStatusRes,
      outputList: outputsRes?.outputs ?? [],
      hotkeyList: hotkeysRes?.hotkeys ?? [],
      stats: statsRes
    })

    const programScene =
      programSceneRes?.currentProgramSceneName ??
      sceneListRes?.scenes[0]?.sceneName ??
      null
    if (programScene) {
      await get().refreshSceneItems(programScene)
    }
  },

  handleEvent: (eventType, eventData) => {

    const entry = {
      id: ++eventIdCounter,
      time: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      eventType,
      eventData
    }
    set((s) => ({
      eventLog: [entry, ...s.eventLog].slice(0, MAX_EVENT_LOG)
    }))

    switch (eventType) {
      case 'CurrentProgramSceneChanged': {
        const name = eventData.sceneName as string
        set({ currentProgramSceneName: name })
        get().refreshSceneItems(name)
        break
      }
      case 'CurrentPreviewSceneChanged':
        set({ currentPreviewSceneName: eventData.sceneName as string })
        break
      case 'SceneListChanged':
        set({ sceneList: (eventData.scenes as SceneEntry[]) ?? [] })
        break
      case 'StudioModeStateChanged':
        set({ studioModeEnabled: eventData.studioModeEnabled as boolean })
        break
      case 'SceneTransitionStarted':
        set({ currentTransitionName: eventData.transitionName as string })
        break
      case 'SceneTransitionEnded':
        break
      case 'CurrentSceneTransitionChanged':
        set({ currentTransitionName: eventData.transitionName as string })
        break
      case 'CurrentSceneTransitionDurationChanged':
        set({ currentTransitionDuration: eventData.transitionDuration as number })
        break
      case 'SceneTransitionListChanged':
        tryCall<{ transitions: TransitionEntry[] }>('GetSceneTransitionList').then((res) => {
          if (res) set({ transitionList: res.transitions })
        })
        break
      case 'InputListChanged':
        tryCall<{ inputs: InputEntry[] }>('GetInputList').then((res) => {
          if (res) set({ inputList: res.inputs })
        })
        break
      case 'SceneItemListChanged':
        get().refreshSceneItems()
        break
      case 'SceneItemCreated':
      case 'SceneItemRemoved':
      case 'SceneItemEnableStateChanged':
      case 'SceneItemLockStateChanged':
      case 'SceneItemTransformChanged':
      case 'SceneItemSelected':
        get().refreshSceneItems()
        break
      case 'StreamStateChanged':
        tryCall<StreamStatusData>('GetStreamStatus').then((res) => {
          if (res) set({ streamStatus: res })
        })
        break
      case 'RecordStateChanged':
        tryCall<RecordStatusData>('GetRecordStatus').then((res) => {
          if (res) set({ recordStatus: res })
        })
        break
      case 'ReplayBufferStateChanged':
        tryCall<ReplayStatusData>('GetReplayBufferStatus').then((res) => {
          if (res) set({ replayStatus: res })
        })
        break
      case 'VirtualcamStateChanged':
        tryCall<VirtualCamStatusData>('GetVirtualCamStatus').then((res) => {
          if (res) set({ virtualCamStatus: res })
        })
        break
      case 'OutputStateChanged':
      case 'OutputListChanged':
        tryCall<{ outputs: OutputEntry[] }>('GetOutputList').then((res) => {
          if (res) set({ outputList: res.outputs })
        })
        break
      case 'SourceFilterListChanged': {
        const inputName = eventData.sourceName as string
        if (inputName) get().refreshFilters(inputName)
        break
      }
      case 'CurrentSceneCollectionChanged':
      case 'SceneCollectionListChanged':
        get().hydrate()
        break
      case 'StatsUpdated':
        set({ stats: eventData.stats as ObsStatsData })
        break
      default:
        break
    }
  },

  refreshScenes: async () => {
    const res = await tryCall<{ scenes: SceneEntry[] }>('GetSceneList')
    if (!res) return
    set({ sceneList: res.scenes ?? [] })

    const prog = await tryCall<{ currentProgramSceneName: string }>('GetCurrentProgramScene')
    if (prog) set({ currentProgramSceneName: prog.currentProgramSceneName })
    const prev = await tryCall<{ currentPreviewSceneName: string }>('GetCurrentPreviewScene')
    if (prev) set({ currentPreviewSceneName: prev.currentPreviewSceneName })
  },

  refreshInputs: async () => {
    const res = await tryCall<{ inputs: InputEntry[] }>('GetInputList')
    if (res) set({ inputList: res.inputs ?? [] })
  },

  refreshOutputStatus: async () => {

    const [stream, record, replay, vcam] = await Promise.all([
      tryCall<StreamStatusData>('GetStreamStatus'),
      tryCall<RecordStatusData>('GetRecordStatus'),
      tryCall<ReplayStatusData>('GetReplayBufferStatus'),
      tryCall<VirtualCamStatusData>('GetVirtualCamStatus')
    ])
    if (stream) set({ streamStatus: stream })
    if (record) set({ recordStatus: record })
    if (replay) set({ replayStatus: replay })
    if (vcam) set({ virtualCamStatus: vcam })
  },

  refreshSceneItems: async (sceneName) => {
    const scene =
      sceneName ??
      get().currentProgramSceneName ??
      get().sceneList[0]?.sceneName ??
      null
    if (!scene) return
    const res = await tryCall<{ sceneItems: SceneItemEntry[] }>('GetSceneItemList', {
      sceneName: scene
    })
    if (res) set({ sceneItemList: res.sceneItems })
  },

  refreshFilters: async (inputName) => {
    const res = await tryCall<{ filters: FilterEntry[] }>('GetSourceFilterList', {
      sourceName: inputName
    })
    set((s) => ({
      filtersByInput: {
        ...s.filtersByInput,
        [inputName]: res?.filters ?? []
      }
    }))
  },

  clearEventLog: () => set({ eventLog: [] })
}))

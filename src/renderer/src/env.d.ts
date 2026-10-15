import type { ObsControllerApi } from '@shared/types'

declare global {
  interface Window {
    obsController: ObsControllerApi
  }
}

export {}

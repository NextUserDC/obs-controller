import type { ObsControllerApi } from '@shared/types'
import { showError, formatObsError } from '../stores/toast'

export const obs: ObsControllerApi = window.obsController

export async function call<T = unknown>(
  requestType: string,
  requestData?: Record<string, unknown>
): Promise<T> {
  try {
    return await obs.callRequest<T>(requestType, requestData)
  } catch (err) {
    showError(`Fallo al ejecutar ${requestType}`, formatObsError(err))
    throw err
  }
}

export async function tryCall<T = unknown>(
  requestType: string,
  requestData?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await obs.callRequest<T>(requestType, requestData)
  } catch {
    return null
  }
}

export async function callQuiet<T = unknown>(
  requestType: string,
  requestData?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await obs.callRequest<T>(requestType, requestData)
  } catch (err) {

    console.debug(`[OBS] ${requestType} falló:`, err)
    return null
  }
}

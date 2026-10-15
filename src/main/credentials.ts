import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type { ConnectionConfig } from '@shared/types'

interface StoredData {
  encrypted: boolean
  payload: string
}

function getStorePath(): string {
  return join(app.getPath('userData'), 'connection.json')
}

export function saveConnection(config: ConnectionConfig): void {
  const json = JSON.stringify(config)
  const path = getStorePath()
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  let data: StoredData
  if (safeStorage.isEncryptionAvailable()) {
    data = {
      encrypted: true,
      payload: safeStorage.encryptString(json).toString('base64')
    }
  } else {
    data = { encrypted: false, payload: json }
  }
  writeFileSync(path, JSON.stringify(data), 'utf8')
}

export function loadConnection(): ConnectionConfig | null {
  const path = getStorePath()
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf8')
    const data = JSON.parse(raw) as StoredData
    let json: string
    if (data.encrypted) {
      json = safeStorage.decryptString(Buffer.from(data.payload, 'base64')).toString()
    } else {
      json = data.payload
    }
    const config = JSON.parse(json) as ConnectionConfig
    if (typeof config.host === 'string' && typeof config.port === 'number') {
      return config
    }
    return null
  } catch {
    return null
  }
}

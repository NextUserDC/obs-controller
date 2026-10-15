import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): AppSettings {
  const path = getSettingsPath()
  if (!existsSync(path)) return { ...DEFAULT_SETTINGS }
  try {
    const raw = readFileSync(path, 'utf8') as string
    const partial = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...partial }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = loadSettings()
  const merged = { ...current, ...partial }
  const path = getSettingsPath()
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(merged, null, 2), 'utf8')
  return merged
}

import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { ObsClient } from './obs-client'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
const obsClient = new ObsClient()

const SPLASH_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#181819;color:#e6e6e6;font-family:Segoe UI,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;user-select:none;">
  <div style="width:56px;height:56px;border-radius:12px;background:#2f81f7;color:#fff;font-size:32px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-bottom:18px;">O</div>
  <div style="font-size:17px;font-weight:600;letter-spacing:0.3px;">OBS Controller</div>
  <div style="font-size:12.5px;color:#8b8b90;margin-top:6px;">Iniciando…</div>
  <div style="margin-top:22px;width:26px;height:26px;border:3px solid #333338;border-top-color:#2f81f7;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
</body>
</html>`

function createSplash(): void {
  try {
    splashWindow = new BrowserWindow({
      width: 420,
      height: 300,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      backgroundColor: '#181819',
      title: 'OBS Controller',
      show: true,
      webPreferences: { sandbox: true }
    })
    splashWindow.setAlwaysOnTop(true, 'screen-saver')
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`)
    splashWindow.on('closed', () => {
      splashWindow = null
    })
  } catch {
    splashWindow = null
  }
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {

    splashWindow.destroy()
  }
  splashWindow = null
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'OBS Controller',
    backgroundColor: '#181819',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    closeSplash()
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    closeSplash()
  })
}

setTimeout(closeSplash, 30000)

app.whenReady().then(() => {
  createSplash()
  registerIpcHandlers(obsClient)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  obsClient.disconnect().catch(() => {})
})

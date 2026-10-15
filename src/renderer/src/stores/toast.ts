import { create } from 'zustand'

export interface Toast {
  id: number
  type: 'error' | 'success' | 'info'
  message: string
  detail?: string
}

interface ToastState {
  toasts: Toast[]
  push: (type: Toast['type'], message: string, detail?: string) => void
  dismiss: (id: number) => void
}

let toastId = 0

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message, detail) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, type, message, detail }].slice(-5) }))

    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, type === 'error' ? 8000 : 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

export function showError(message: string, detail?: string): void {
  useToast.getState().push('error', message, detail)
}

export function showSuccess(message: string): void {
  useToast.getState().push('success', message)
}

export function showInfo(message: string): void {
  useToast.getState().push('info', message)
}

export function formatObsError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { code?: number; message?: string; error?: string; comment?: string }
    if (e.code && e.error) {
      return `OBS rechazó la operación (código ${e.code}): ${e.error}${e.comment ? ` — ${e.comment}` : ''}`
    }
    if (e.message) return e.message
  }
  return String(err)
}

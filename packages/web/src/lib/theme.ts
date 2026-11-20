import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'area.theme'

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(mode)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

export function readTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

export function writeTheme(mode: ThemeMode): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme(mode)
}

export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function useThemeModeState(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(readTheme)

  useEffect(() => {
    writeTheme(mode)
  }, [mode])

  useEffect(
    () =>
      watchSystemTheme(() => {
        if (readTheme() === 'system') applyTheme('system')
      }),
    [],
  )

  return [mode, setMode]
}

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      const { key, ctrl = false, meta = false, shift = false, alt = false, action } = shortcut

      const keyMatch = event.key.toLowerCase() === key.toLowerCase()
      const ctrlMatch = ctrl ? event.ctrlKey : !event.ctrlKey && !event.metaKey
      const metaMatch = meta ? event.metaKey : true
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey
      const altMatch = alt ? event.altKey : !event.altKey

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault()
        event.stopPropagation()
        action()
        return
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export function useKeyboardShortcut(
  key: string,
  action: () => void,
  options: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const { ctrl = false, meta = false, shift = false, alt = false } = options

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === key.toLowerCase()) {
        const ctrlMatch = ctrl ? event.ctrlKey : !event.ctrlKey && !event.metaKey
        const metaMatch = meta ? event.metaKey : true
        const shiftMatch = shift ? event.shiftKey : !event.shiftKey
        const altMatch = alt ? event.altKey : !event.altKey

        if (ctrlMatch && metaMatch && shiftMatch && altMatch) {
          event.preventDefault()
          event.stopPropagation()
          action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, action, ctrl, meta, shift, alt])
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')
  }
  if (shortcut.alt) {
    parts.push('Option')
  }
  if (shortcut.shift) {
    parts.push('Shift')
  }
  if (shortcut.key) {
    parts.push(shortcut.key.toUpperCase())
  }

  return parts.join(' + ')
}

export const defaultShortcuts: KeyboardShortcut[] = [
  {
    key: 'n',
    ctrl: true,
    action: () => {
      window.location.href = '/dashboard'
    },
    description: 'New session',
  },
  {
    key: '/',
    ctrl: true,
    action: () => {
      const input = document.querySelector('textarea') as HTMLTextAreaElement
      input?.focus()
    },
    description: 'Focus chat input',
  },
  {
    key: 'Escape',
    action: () => {
      document.exitFullscreen?.()
    },
    description: 'Exit fullscreen',
  },
]

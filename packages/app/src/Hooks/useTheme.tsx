import { useEffect } from 'react'

import usePreferences from './usePreferences'

export function useTheme() {
  const theme = usePreferences(s => s.theme)

  useEffect(() => {
    const osTheme = window.matchMedia('(prefers-color-scheme: light)')
    setTheme(theme === 'system' && osTheme.matches ? 'light' : theme === 'light' ? 'light' : 'dark')

    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setTheme(e.matches ? 'light' : 'dark')
      }
    }
    osTheme.addEventListener('change', handler)
    return () => {
      osTheme.removeEventListener('change', handler)
    }
  }, [theme])
}

export function setTheme(theme: 'light' | 'dark') {
  const elm = document.documentElement
  if (theme === 'light' && !elm.classList.contains('light')) {
    elm.classList.add('light')
    elm.classList.remove('dark')
  } else if (theme === 'dark' && !elm.classList.contains('dark')) {
    elm.classList.add('dark')
    elm.classList.remove('light')
  }
}

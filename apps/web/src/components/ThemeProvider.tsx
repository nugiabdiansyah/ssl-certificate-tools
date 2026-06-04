'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggle: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('ssl-tools-theme') as Theme | null
    const initial: Theme = saved === 'light' ? 'light' : 'dark'
    setTheme(initial)
    applyClass(initial)
  }, [])

  function applyClass(t: Theme) {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(t)
  }

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyClass(next)
    localStorage.setItem('ssl-tools-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

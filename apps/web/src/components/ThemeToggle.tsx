'use client'
import { useTheme } from './ThemeProvider'

// Bulb ON — menyala, dipakai saat light mode aktif
function BulbOn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-4.9 11.89c.44.44.9 1.03.9 1.61V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1.5c0-.58.46-1.17.9-1.61A7 7 0 0 0 12 2z" />
      <path d="M9 17h6M9 19.5h6" strokeLinecap="round" />
      <path d="M12 21a1 1 0 0 0 1-1h-2a1 1 0 0 0 1 1z" />
      {/* Kilatan cahaya */}
      <path d="M12 0v1.5M4.22 4.22l1.06 1.06M0 12h1.5M4.22 19.78l1.06-1.06M19.78 4.22l-1.06 1.06M22.5 12H24M19.78 19.78l-1.06-1.06"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// Bulb OFF — mati, dipakai saat dark mode aktif
function BulbOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.2V16a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-1.8A6 6 0 0 1 6 9a6 6 0 0 1 6-6z" />
      <path d="M9 17h6" />
      <path d="M10 20h4" />
    </svg>
  )
}

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isDark
          ? 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
          : 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
      }`}
    >
      {isDark ? <BulbOff /> : <BulbOn />}
    </button>
  )
}

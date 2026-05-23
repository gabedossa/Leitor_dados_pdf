'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem('theme', theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const initialTheme = getInitialTheme()
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === 'dark' ? 'light' : 'dark'
      applyTheme(nextTheme)
      return nextTheme
    })
  }

  const isDark = theme === 'dark'

  return (
    <div className="fixed right-4 top-4 z-50">
      <button
        type="button"
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className={cn(
          'relative inline-flex h-9 w-16 items-center rounded-full border p-1 shadow-sm backdrop-blur transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          isDark
            ? 'border-gray-700 bg-gray-900/95 focus:ring-offset-gray-950'
            : 'border-gray-200 bg-white/95 focus:ring-offset-white'
        )}
      >
        <span className="absolute left-2 text-yellow-500">
          <Sun className="h-3.5 w-3.5" />
        </span>
        <span className="absolute right-2 text-slate-400">
          <Moon className="h-3.5 w-3.5" />
        </span>
        <span
          className={cn(
            'relative z-10 flex h-7 w-7 items-center justify-center rounded-full shadow transition-transform',
            isDark
              ? 'translate-x-7 bg-gray-100 text-gray-900'
              : 'translate-x-0 bg-primary-600 text-white'
          )}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </span>
      </button>
    </div>
  )
}

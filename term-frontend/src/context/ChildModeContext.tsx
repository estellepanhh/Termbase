/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'termbase-reading-preferences'
type ReadingPreferences = { childMode: boolean; largeTextMode: boolean }
type ChildModeContextType = { isChildMode: boolean; isLargeTextMode: boolean; toggleChildMode: () => void; toggleLargeTextMode: () => void }
const defaults: ReadingPreferences = { childMode: false, largeTextMode: false }

const ChildModeContext = createContext<ChildModeContextType>({ isChildMode: false, isLargeTextMode: false, toggleChildMode: () => undefined, toggleLargeTextMode: () => undefined })

function readPreferences(): ReadingPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ReadingPreferences>
    return { childMode: saved.childMode === true, largeTextMode: saved.largeTextMode === true }
  } catch { return defaults }
}

export function ChildModeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences)
  function update(key: keyof ReadingPreferences) {
    setPreferences((current) => {
      const next = { ...current, [key]: !current[key] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage may be unavailable */ }
      return next
    })
  }
  const value = useMemo(() => ({
    isChildMode: preferences.childMode, isLargeTextMode: preferences.largeTextMode,
    toggleChildMode: () => update('childMode'), toggleLargeTextMode: () => update('largeTextMode'),
  }), [preferences])

  return <ChildModeContext.Provider value={value}>{children}</ChildModeContext.Provider>
}

export const useChildMode = () => useContext(ChildModeContext)

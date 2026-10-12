import { useEffect } from 'react'

// All forms and drawing sessions share one browser listener, with independent ownership.
const owners = new Set<symbol>()
const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
export function useUnsavedChangesWarning(active: boolean) {
  useEffect(() => {
    if (!active) return
    const owner = Symbol()
    if (owners.size === 0) window.addEventListener('beforeunload', warn)
    owners.add(owner)
    return () => {
      owners.delete(owner)
      if (owners.size === 0) window.removeEventListener('beforeunload', warn)
    }
  }, [active])
}

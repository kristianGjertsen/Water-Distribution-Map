import { useEffect, useState } from 'react'
import { getMapAccess } from '@/services/authService'

export default function UserPermission({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<'loading' | 'full' | 'none' | 'error'>('loading')

  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const allowed = await getMapAccess(userId)
        if (active) setPermission(allowed ? 'full' : 'none')
      } catch {
        if (active) setPermission('error')
      }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh) }
  }, [userId])

  const label = {
    loading: 'Henter tilgang …',
    full: 'Full karttilgang',
    none: 'Ingen karttilgang',
    error: 'Kunne ikke hente tilgang',
  }[permission]

  return <span role="status" title={permission === 'full' ? 'Kan lese, opprette, redigere og slette kartobjekter' : undefined}
    className={`rounded-full px-2 py-1 text-xs ${permission === 'full' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
    Permission: {label}
  </span>
}

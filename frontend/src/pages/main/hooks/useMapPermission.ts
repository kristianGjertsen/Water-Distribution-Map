import { useEffect, useState } from 'react'
import { getMapAccess } from '@/shared/auth/authService'

export type MapPermission = 'loading' | 'full' | 'none' | 'error'

export function useMapPermission(userId: string): MapPermission {
  const [result, setResult] = useState<{ userId: string; permission: MapPermission } | null>(null)

  useEffect(() => {
    let active = true
    let requestId = 0
    async function refresh() {
      const currentRequest = ++requestId
      try {
        const allowed = await getMapAccess(userId)
        if (active && currentRequest === requestId) {
          setResult({ userId, permission: allowed ? 'full' : 'none' })
        }
      } catch {
        if (active && currentRequest === requestId) setResult({ userId, permission: 'error' })
      }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [userId])

  return result?.userId === userId ? result.permission : 'loading'
}

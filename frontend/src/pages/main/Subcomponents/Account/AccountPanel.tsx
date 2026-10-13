import { useState } from 'react'
import UserPermission from './UserPermission'
import { useMapPermission } from '@/pages/main/hooks/useMapPermission'
import { authErrorMessage, signOut } from '@/shared/auth/authService'

type Props = { userId: string }

export default function AccountPanel({ userId }: Props) {
  const permission = useMapPermission(userId)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      await signOut()
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setSigningOut(false)
    }
  }

  return (
      <div className="absolute bottom-12 left-4 max-w-[calc(100%-5rem)] rounded-lg bg-white p-3 text-sm shadow">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={signingOut} onClick={handleSignOut} className="font-medium text-sky-700 underline disabled:opacity-50">
            {signingOut ? 'Logger ut …' : 'Logg ut'}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      </div>
  )
}

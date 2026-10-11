import { useState } from 'react'
import AuthForm from '@/components/AuthForm'
import WaterMap from '@/components/WaterMap'
import UserPermission from '@/components/UserPermission'
import { useSession } from '@/hooks/useSession'
import { authErrorMessage, signOut } from '@/services/authService'

function App() {
  const { session, loading } = useSession()
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

  if (loading) {
    return <p role="status" className="flex min-h-dvh items-center justify-center text-slate-600">Laster …</p>
  }
  if (!session) return <AuthForm />

  return (
    <div className="relative">
      <WaterMap key={session.user.id} />
      <div className="absolute bottom-12 left-4 max-w-[calc(100%-5rem)] rounded-lg bg-white p-3 text-sm shadow">
        <div className="flex flex-wrap items-center gap-3">
          <span className="break-all text-slate-700">{session.user.email}</span>
          <UserPermission key={session.user.id} userId={session.user.id} />
          <button type="button" disabled={signingOut} onClick={handleSignOut} className="font-medium text-sky-700 underline disabled:opacity-50">
            {signingOut ? 'Logger ut …' : 'Logg ut'}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      </div>
    </div>
  )
}

export default App

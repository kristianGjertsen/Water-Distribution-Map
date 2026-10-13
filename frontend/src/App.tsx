import AuthPage from '@/pages/auth/AuthPage'
import MapPage from '@/pages/main/MapPage'
import { useSession } from '@/shared/auth/useSession'

function App() {
  const { session, loading } = useSession()
  if (loading) {
    return <p role="status" className="flex min-h-dvh items-center justify-center text-slate-600">Laster …</p>
  }
  if (!session) return <AuthPage />
  return <MapPage key={session.user.id} userId={session.user.id} />
}

export default App

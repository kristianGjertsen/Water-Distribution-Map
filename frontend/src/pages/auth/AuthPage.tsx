import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { authErrorMessage, signIn, signUp } from '@/shared/auth/authService'

export default function AuthPage() {
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError(null)
    setMessage(null)
    if (register && password !== confirmation) {
      setError('Passordene er ikke like.')
      return
    }
    setPending(true)
    try {
      if (register) {
        const { session } = await signUp(email.trim(), password)
        if (!session) {
          setMessage('Sjekk e-posten din for en bekreftelseslenke. Logg inn når adressen er bekreftet.')
          setRegister(false)
          setPassword('')
          setConfirmation('')
        }
      } else {
        await signIn(email.trim(), password)
      }
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm" aria-labelledby="auth-heading">
        <h1 id="auth-heading" className="text-2xl font-bold text-slate-900">{register ? 'Opprett bruker' : 'Logg inn'}</h1>
        <p className="mt-2 text-sm text-slate-600">Vannledningskart</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">E-post</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">Passord</label>
              <input id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} aria-describedby={register ? 'password-hint' : undefined} />
              {register && <p id="password-hint" className="mt-1 text-xs text-slate-600">Bruk minst 8 tegn.</p>}
            </div>
            {register && (
              <div>
                <label htmlFor="confirmation" className="mb-1 block text-sm font-medium">Gjenta passord</label>
                <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} />
              </div>
            )}
            <button type="submit" className="w-full rounded-lg bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:cursor-wait">
              {pending ? 'Vennligst vent …' : register ? 'Opprett bruker' : 'Logg inn'}
            </button>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="text-sm text-green-800">{message}</p>}
        </form>
        <button type="button" disabled={pending} onClick={() => {
          setRegister(!register)
          setPassword('')
          setConfirmation('')
          setError(null)
          setMessage(null)
        }} className="mt-5 text-sm font-medium text-sky-700 underline disabled:opacity-50">
          {register ? 'Har du bruker? Logg inn' : 'Ny her? Opprett bruker'}
        </button>
      </section>
    </main>
  )
}

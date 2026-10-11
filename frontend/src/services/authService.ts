import { supabase } from '@/lib/supabase'

export async function getMapAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('map_access').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data !== null
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  switch (code) {
    case 'invalid_credentials': return 'Feil e-postadresse eller passord.'
    case 'email_not_confirmed': return 'Bekreft e-postadressen din før du logger inn.'
    case 'user_already_exists': return 'Denne e-postadressen er allerede registrert. Prøv å logge inn.'
    case 'weak_password': return 'Passordet er for svakt. Bruk et lengre passord med bokstaver, tall og symboler.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'For mange forsøk. Vent litt før du prøver igjen.'
    case 'signup_disabled': return 'Registrering er ikke tilgjengelig akkurat nå.'
    default: return 'Kunne ikke fullføre. Sjekk nettforbindelsen og prøv igjen.'
  }
}

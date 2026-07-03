import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () =>
    supabase.auth.signOut()

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

  const checkProfileExists = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    return !!data
  }

  return { user, session, loading, signUp, signIn, signOut, signInWithGoogle, checkProfileExists }
}

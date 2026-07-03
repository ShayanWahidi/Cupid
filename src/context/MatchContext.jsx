import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const MatchContext = createContext(null)

export function MatchProvider({ children }) {
  const { user } = useAuth()
  const [showMatch, setShowMatch] = useState(false)
  const [matchedUser, setMatchedUser] = useState(null)

  const dismissMatch = useCallback(() => {
    setShowMatch(false)
    setMatchedUser(null)
  }, [])

  const triggerMatch = useCallback((profile) => {
    setMatchedUser(profile)
    setShowMatch(true)
  }, [])

  const insertNotification = useCallback(async (matchId, fromUserId) => {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'match',
      match_id: matchId,
      from_user_id: fromUserId,
      read: false,
    })
  }, [user])

  useEffect(() => {
    if (!user) return

    const ch1 = supabase
      .channel('match-notif-1')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
        filter: `user1_id=eq.${user.id}`,
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles').select('*')
          .eq('user_id', payload.new.user2_id).single()
        if (profile) {
          triggerMatch(profile)
          insertNotification(payload.new.id, payload.new.user2_id)
        }
      })
      .subscribe()

    const ch2 = supabase
      .channel('match-notif-2')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
        filter: `user2_id=eq.${user.id}`,
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles').select('*')
          .eq('user_id', payload.new.user1_id).single()
        if (profile) {
          triggerMatch(profile)
          insertNotification(payload.new.id, payload.new.user1_id)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [user, triggerMatch, insertNotification])

  return (
    <MatchContext.Provider value={{ showMatch, matchedUser, dismissMatch, triggerMatch }}>
      {children}
    </MatchContext.Provider>
  )
}

export function useMatchContext() {
  const ctx = useContext(MatchContext)
  if (!ctx) throw new Error('useMatchContext must be used within MatchProvider')
  return ctx
}

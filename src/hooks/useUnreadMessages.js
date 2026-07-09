import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useUnreadMessages(user) {
  const [totalUnread, setTotalUnread] = useState(0)
  const [unreadByMatch, setUnreadByMatch] = useState({})
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setLoading(true)

    const fetchUnreadCounts = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      if (cancelled) return

      if (!matches || matches.length === 0) {
        setTotalUnread(0)
        setUnreadByMatch({})
        setLoading(false)
        return
      }

      const matchIds = matches.map(m => m.id)

      const { data: unreadData } = await supabase
        .from('messages')
        .select('match_id')
        .in('match_id', matchIds)
        .eq('read', false)
        .neq('sender_id', user.id)

      if (cancelled) return

      const counts = {}
      let total = 0
      if (unreadData) {
        unreadData.forEach(msg => {
          counts[msg.match_id] = (counts[msg.match_id] || 0) + 1
          total++
        })
      }

      setUnreadByMatch(counts)
      setTotalUnread(total)
      setLoading(false)
    }

    fetchUnreadCounts()

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.sender_id !== user.id && payload.new.read === false) {
            setTotalUnread(prev => prev + 1)
            setUnreadByMatch(prev => ({
              ...prev,
              [payload.new.match_id]: (prev[payload.new.match_id] || 0) + 1,
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.read === true && payload.new.sender_id !== user.id) {
            setUnreadByMatch(prev => {
              const current = prev[payload.new.match_id]
              if (!current || current <= 0) return prev
              return { ...prev, [payload.new.match_id]: current - 1 }
            })
            setTotalUnread(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe((status) => {
        console.log('useUnreadMessages subscription status:', status)
      })

    channelRef.current = channel

    return () => {
      cancelled = true
      console.log('useUnreadMessages cleanup: unsubscribing channel')
      channel.unsubscribe()
    }
  }, [user])

  const markAsRead = useCallback(async (matchId) => {
    if (!user) return

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .eq('read', false)
      .neq('sender_id', user.id)

    if (!error) {
      setUnreadByMatch(prev => {
        const count = prev[matchId] || 0
        if (count > 0) {
          setTotalUnread(prevTotal => Math.max(0, prevTotal - count))
        }
        const { [matchId]: _, ...rest } = prev
        return rest
      })
    }
  }, [user])

  return { totalUnread, unreadByMatch, markAsRead, loading }
}

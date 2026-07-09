import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'

export default function Matches() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchMatches()
  }, [user])

  const fetchMatches = async () => {
    setLoading(true)

    const { data: matchRows } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (!matchRows || matchRows.length === 0) {
      setMatches([])
      setLoading(false)
      return
    }

    const otherIds = matchRows.map((m) =>
      m.user1_id === user.id ? m.user2_id : m.user1_id
    )

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', otherIds)

    const profileMap = {}
    if (profiles) {
      profiles.forEach((p) => {
        profileMap[p.user_id] = p
      })
    }

    const matchIds = matchRows.map((m) => m.id)
    const latestMsgMap = {}

    if (matchIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('match_id, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      if (msgs) {
        msgs.forEach((msg) => {
          if (!latestMsgMap[msg.match_id]) {
            latestMsgMap[msg.match_id] = msg.created_at
          }
        })
      }
    }

    const combined = matchRows.map((m) => {
      const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
      return {
        matchId: m.id,
        profile: profileMap[otherId] || null,
        latestMsgAt: latestMsgMap[m.id] || m.created_at,
      }
    })

    combined.sort((a, b) => new Date(b.latestMsgAt) - new Date(a.latestMsgAt))

    setMatches(combined)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#000926]">
        <div className="w-6 h-6 border-2 border-[#A6C5D7]/30 border-t-[#A6C5D7] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh pb-16 bg-[#000926]">
      <Header />

      {matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-4xl mb-4">💫</p>
          <p className="text-[#A6C5D7] text-lg font-sora font-bold">No matches yet.</p>
          <p className="font-pjs text-[#A6C5D7]/60 text-sm mt-1">Keep swiping!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="flex flex-col gap-3">
            {matches.map(({ matchId, profile }, index) => (
              <motion.button
                key={matchId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                onClick={() => navigate(`/chat/${matchId}`)}
                className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 transition text-left"
              >
                {profile?.photos?.[0] ? (
                  <img
                    src={profile.photos[0]}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-[#A6C5D7]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/10 shrink-0 ring-2 ring-[#A6C5D7]/30" />
                )}
                <div className="min-w-0">
                  <p className="font-sora font-bold text-[#F0F4FF] truncate">
                    {profile?.name || 'Unknown'}
                  </p>
                  {profile && (
                    <p className="font-pjs text-sm text-[#A6C5D7]/70 truncate">
                      {profile.branch} &middot; {profile.year}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

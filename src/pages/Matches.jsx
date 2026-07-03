import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

    const combined = matchRows.map((m) => {
      const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
      return {
        matchId: m.id,
        profile: profileMap[otherId] || null,
      }
    })

    setMatches(combined)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh pb-16">
      <Header />

      {matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-4xl mb-4">💫</p>
          <p className="text-gray-500 text-lg">No matches yet.</p>
          <p className="text-gray-400 text-sm mt-1">Keep swiping!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="flex flex-col gap-3">
            {matches.map(({ matchId, profile }) => (
              <button
                key={matchId}
                onClick={() => navigate(`/chat/${matchId}`)}
                className="flex items-center gap-4 p-3 rounded-2xl active:bg-gray-50 transition text-left"
              >
                {profile?.photos?.[0] ? (
                  <img
                    src={profile.photos[0]}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {profile?.name || 'Unknown'}
                  </p>
                  {profile && (
                    <p className="text-sm text-gray-400 truncate">
                      {profile.branch} &middot; {profile.year}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

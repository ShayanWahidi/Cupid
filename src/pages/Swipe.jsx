import React from 'react'
import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TinderCard from 'react-tinder-card'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useMatchContext } from '../context/MatchContext'
import Header from '../components/Header'

export default function Swipe() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { triggerMatch } = useMatchContext()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMatch, setShowMatch] = useState(false)
  const [matchedUser, setMatchedUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const swipingRef = useRef(false)
  const profilesRef = useRef(profiles)

  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

  const childRefs = useMemo(
    () => Array(profiles.length).fill(0).map(() => React.createRef()),
    [profiles.length]
  )

  useEffect(() => {
    if (!user) return
    fetchProfiles()
  }, [user])

  const fetchProfiles = async () => {
    setLoading(true)
    setError(null)

    const { data: swipedRows } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', user.id)

    const { data: blockedRows } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)

    const excludeIds = new Set(swipedRows?.map((r) => r.swiped_id) || [])
    if (blockedRows) {
      blockedRows.forEach((r) => {
        const otherId = r.blocker_id === user.id ? r.blocked_id : r.blocker_id
        excludeIds.add(otherId)
      })
    }

    let query = supabase.from('profiles').select('*').neq('user_id', user.id)

    const excludeArr = [...excludeIds]
    if (excludeArr.length > 0) {
      query = query.not('user_id', 'in', `("${excludeArr.join('","')}")`)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProfiles(data || [])
    }

    setLoading(false)
  }

  const checkMutualLike = async (swipedId) => {
    const { data } = await supabase
      .from('swipes')
      .select('id')
      .eq('swiper_id', swipedId)
      .eq('swiped_id', user.id)
      .eq('direction', 'like')
      .maybeSingle()
    return !!data
  }

  const swiped = useCallback(async (direction, index) => {
    if (swipingRef.current) return
    swipingRef.current = true

    const currentProfiles = profilesRef.current
    const profile = currentProfiles[index]
    if (!profile) {
      swipingRef.current = false
      return
    }

    const dir = direction === 'right' ? 'like' : 'pass'

    const { error: swipeError } = await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: profile.user_id,
      direction: dir,
    })

    if (swipeError) {
      swipingRef.current = false
      return
    }

    if (dir === 'like') {
      const isMutual = await checkMutualLike(profile.user_id)
      if (isMutual) {
        await supabase.from('matches').insert({
          user1_id: user.id,
          user2_id: profile.user_id,
        })
        triggerMatch(profile)
      }
    }

    setProfiles((prev) => prev.filter((_, i) => i !== index))
    swipingRef.current = false
  }, [user, triggerMatch])

  const swipe = async (dir) => {
    const topIdx = profiles.length - 1
    if (topIdx < 0) return
    await childRefs[topIdx]?.current?.swipe(dir)
  }

  const handleReport = async (profile) => {
    await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: profile.user_id,
      reason: 'reported from swipe',
    })
    setMenuOpen(null)
    setProfiles((prev) => prev.filter((p) => p.user_id !== profile.user_id))
  }

  const handleBlock = async (profile) => {
    await supabase.from('blocks').insert({
      blocker_id: user.id,
      blocked_id: profile.user_id,
    })
    setMenuOpen(null)
    setProfiles((prev) => prev.filter((p) => p.user_id !== profile.user_id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={fetchProfiles}
          className="bg-black text-white rounded-xl px-6 py-2.5 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh pb-16">
      <Header />
      {profiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-5xl mb-5">🔍</span>
          <h2 className="text-xl font-semibold text-gray-900">No more profiles for now</h2>
          <p className="text-gray-400 mt-2">Check back later when more students join!</p>
        </div>
      ) : (
        <>
          <div className="flex-1 relative mx-auto w-full max-w-[430px] px-4 pt-4">
            <div className="relative w-full h-full">
              {[...profiles].reverse().map((profile, i) => {
                const originalIndex = profiles.length - 1 - i
                const isTop = i === 0
                const offset = i * 8

                return (
                  <div
                    key={profile.user_id}
                    className="absolute inset-0"
                    style={{
                      zIndex: profiles.length - i,
                      top: offset,
                      transform: `scale(${1 - i * 0.02})`,
                      pointerEvents: isTop ? 'auto' : 'none',
                    }}
                  >
                    <TinderCard
                      ref={childRefs[originalIndex]}
                      onSwipe={(dir) => swiped(dir, originalIndex)}
                      preventSwipe={['up', 'down']}
                      flickOnSwipe
                      swipeRequirementType="position"
                      swipeThreshold={120}
                      className="absolute inset-0"
                    >
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-white shadow-lg relative">
                        {profile.photos?.[0] ? (
                          <img
                            src={profile.photos[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            No photo
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 pt-14 pb-5">
                          <h2 className="text-white text-xl font-bold">
                            {profile.name}, {profile.age}
                          </h2>
                          <p className="text-white/80 text-sm mt-0.5">
                            {profile.branch} &middot; {profile.year}
                          </p>
                          {profile.bio && (
                            <p className="text-white/70 text-sm mt-1.5 leading-snug line-clamp-3">
                              {profile.bio}
                            </p>
                          )}
                        </div>

                        {isTop && (
                          <div className="absolute top-3 right-3">
                            <button
                              onClick={() =>
                                setMenuOpen(menuOpen === profile.user_id ? null : profile.user_id)
                              }
                              className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white text-lg leading-none"
                            >
                              &#8942;
                            </button>
                            {menuOpen === profile.user_id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setMenuOpen(null)}
                                />
                                <div className="absolute top-10 right-0 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-44 overflow-hidden">
                                  <button
                                    onClick={() => handleReport(profile)}
                                    className="w-full px-4 py-3 text-sm text-left text-gray-700 active:bg-gray-50 transition"
                                  >
                                    Report {profile.name}
                                  </button>
                                  <div className="h-px bg-gray-100" />
                                  <button
                                    onClick={() => handleBlock(profile)}
                                    className="w-full px-4 py-3 text-sm text-left text-red-500 active:bg-red-50 transition"
                                  >
                                    Block {profile.name}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TinderCard>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 py-6 pb-8">
            <button
              onClick={() => swipe('left')}
              className="w-16 h-16 rounded-full border-2 border-gray-200 flex items-center justify-center text-3xl text-gray-500 active:bg-gray-50 transition shadow-sm"
            >
              &#10005;
            </button>
            <button
              onClick={() => swipe('right')}
              className="w-16 h-16 rounded-full border-2 border-red-200 flex items-center justify-center text-3xl text-red-400 active:bg-red-50 transition shadow-sm"
            >
              &#9829;
            </button>
          </div>
        </>
      )}
    </div>
  )
}

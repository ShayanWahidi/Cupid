import React from 'react'
import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { XMarkIcon, EllipsisVerticalIcon, FlagIcon, NoSymbolIcon, MagnifyingGlassIcon, ArrowUturnLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import TinderCard from 'react-tinder-card'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useMatchContext } from '../context/MatchContext'
import Header from '../components/Header'
import ToCAgreementModal from '../components/ToCAgreementModal'

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
  const [lastSwiped, setLastSwiped] = useState(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showToC, setShowToC] = useState(false)
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
    supabase.from('toc_acceptance').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) setShowToC(true)
      })
  }, [user])

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

  const navigatePhoto = (dir) => {
    const topProfile = profiles[profiles.length - 1]
    if (!topProfile?.photos || topProfile.photos.length <= 1) return
    const maxIdx = topProfile.photos.length - 1
    setPhotoIndex((prev) =>
      dir === 'next'
        ? prev >= maxIdx ? 0 : prev + 1
        : prev <= 0 ? maxIdx : prev - 1
    )
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
        const { data: newMatch } = await supabase.from('matches').insert({
          user1_id: user.id,
          user2_id: profile.user_id,
        }).select().single()

        triggerMatch(profile)

        if (newMatch) {
          try {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'match',
              match_id: newMatch.id,
              from_user_id: profile.user_id,
              read: false,
            })
          } catch (_) {}

          try {
            await supabase.from('notifications').insert({
              user_id: profile.user_id,
              type: 'match',
              match_id: newMatch.id,
              from_user_id: user.id,
              read: false,
            })
          } catch (_) {}
        }
      }
    }

    setLastSwiped(profile)
    setPhotoIndex(0)

    setProfiles((prev) => prev.filter((_, i) => i !== index))
    swipingRef.current = false
  }, [user, triggerMatch])

  const swipe = async (dir) => {
    const topIdx = profiles.length - 1
    if (topIdx < 0) return
    await childRefs[topIdx]?.current?.swipe(dir)
  }

  const handleUndo = async () => {
    if (!lastSwiped) return
    await supabase.from('swipes').delete()
      .eq('swiper_id', user.id)
      .eq('swiped_id', lastSwiped.user_id)
    setProfiles((prev) => [...prev, lastSwiped])
    setLastSwiped(null)
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
      <div className="flex items-center justify-center min-h-dvh bg-[#000926]">
        <div className="w-6 h-6 border-2 border-[#A6C5D7]/30 border-t-[#A6C5D7] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-3 bg-[#000926]">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchProfiles}
          className="bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl px-6 py-2.5 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh pb-16 bg-[#000926]">
      <Header />
      {profiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <span className="mb-5">
            <MagnifyingGlassIcon className="w-12 h-12 text-[#A6C5D7]/40" />
          </span>
          <h2 className="text-xl font-sora font-bold text-[#D6E6F3]">No more profiles for now</h2>
          <p className="font-pjs text-[#A6C5D7] mt-2">Check back later when more students join!</p>
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
                      <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative select-none">
                        {profile.photos?.length > 0 ? (
                          <img
                            src={profile.photos[photoIndex]}
                            alt=""
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center text-[#A6C5D7]/50">
                            No photo
                          </div>
                        )}

                        {isTop && profile.photos?.length > 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigatePhoto('prev') }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition opacity-70 hover:opacity-100"
                            >
                              <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigatePhoto('next') }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition opacity-70 hover:opacity-100"
                            >
                              <ChevronRightIcon className="w-5 h-5" />
                            </button>
                            <div className="absolute top-3 left-3 bg-black/40 text-white text-xs font-pjs font-medium px-2 py-0.5 rounded-full">
                              {photoIndex + 1}/{profile.photos.length}
                            </div>
                            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {profile.photos.map((_, dotIdx) => (
                                <button
                                  key={dotIdx}
                                  onClick={(e) => { e.stopPropagation(); setPhotoIndex(dotIdx) }}
                                  className={`w-2 h-2 rounded-full transition ${
                                    dotIdx === photoIndex ? 'bg-[#A6C5D7]' : 'bg-[#A6C5D7]/40'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#000926] to-transparent px-5 pt-14 pb-5">
                          <h2 className="text-[#F0F4FF] text-xl font-sora font-bold">
                            {profile.name}, {profile.age}
                          </h2>
                          <p className="font-pjs text-[#D6E6F3]/80 text-sm mt-0.5">
                            {profile.branch} &middot; {profile.year}
                          </p>
                          {profile.bio && (
                            <p className="font-pjs text-[#D6E6F3]/60 text-sm mt-1.5 leading-snug line-clamp-3">
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
                              className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
                            >
                              <EllipsisVerticalIcon className="w-5 h-5" />
                            </button>
                            {menuOpen === profile.user_id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setMenuOpen(null)}
                                />
                                <div className="absolute top-10 right-0 z-20 bg-[#000926] rounded-xl shadow-xl border border-white/10 w-44 overflow-hidden">
                                  <button
                                    onClick={() => handleReport(profile)}
                                    className="w-full px-4 py-3 text-sm text-left text-[#A6C5D7] active:bg-white/5 transition flex items-center gap-2"
                                  >
                                    <FlagIcon className="w-4 h-4" />
                                    Report {profile.name}
                                  </button>
                                  <div className="h-px bg-white/10" />
                                  <button
                                    onClick={() => handleBlock(profile)}
                                    className="w-full px-4 py-3 text-sm text-left text-red-400 active:bg-white/5 transition flex items-center gap-2"
                                  >
                                    <NoSymbolIcon className="w-4 h-4" />
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
            <motion.button
              onClick={handleUndo}
              whileHover={{ scale: lastSwiped ? 1.1 : 1 }}
              whileTap={{ scale: lastSwiped ? 0.9 : 1 }}
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition shadow-sm ${
                lastSwiped
                  ? 'border-[#A6C5D7] text-[#A6C5D7]'
                  : 'border-[#A6C5D7]/20 text-[#A6C5D7]/20 cursor-not-allowed'
              }`}
            >
              <ArrowUturnLeftIcon className="w-8 h-8" />
            </motion.button>
            <motion.button
              onClick={() => swipe('left')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 rounded-full border-2 border-[#A6C5D7]/40 flex items-center justify-center text-[#A6C5D7] transition shadow-sm"
            >
              <XMarkIcon className="w-8 h-8" />
            </motion.button>
            <motion.button
              onClick={() => swipe('right')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] flex items-center justify-center text-white shadow-sm"
            >
              <HeartSolid className="w-8 h-8" />
            </motion.button>
          </div>
        </>
      )}

      {showToC && user && (
        <ToCAgreementModal
          user={user}
          onAccept={() => setShowToC(false)}
        />
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import UserProfileModal from '../components/UserProfileModal'

export default function Chat() {
  const { matchId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [otherProfile, setOtherProfile] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user || !matchId) return
    initChat()
    return () => {
      supabase.removeAllChannels()
    }
  }, [user, matchId])

  const initChat = async () => {
    setLoading(true)

    const { data: matchRow } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!matchRow) {
      setLoading(false)
      return
    }

    const otherId =
      matchRow.user1_id === user.id
        ? matchRow.user2_id
        : matchRow.user1_id

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', otherId)
      .single()

    setOtherProfile(profile)

    const { data: msgRows } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    setMessages(msgRows || [])
    setLoading(false)

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      match_id: matchId,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: user.id, content: text })
      .select()

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } else if (data?.[0]) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data[0].id } : m))
      )
    }

    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReport = async () => {
    if (!otherProfile) return
    await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: otherProfile.user_id,
      reason: 'reported from chat',
    })
    setMenuOpen(false)
  }

  const handleBlock = async () => {
    if (!otherProfile) return
    await supabase.from('blocks').insert({
      blocker_id: user.id,
      blocked_id: otherProfile.user_id,
    })
    setMenuOpen(false)
    navigate('/matches', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#000926]">
        <div className="w-6 h-6 border-2 border-[#A6C5D7]/30 border-t-[#A6C5D7] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-[#000926]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0 bg-[#000926]/90 backdrop-blur-md">
        <button
          onClick={() => navigate('/matches')}
          className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
        >
          <svg className="w-5 h-5 text-[#D6E6F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          {otherProfile?.photos?.[0] ? (
            <img
              src={otherProfile.photos[0]}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-[#A6C5D7]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/10 shrink-0 ring-2 ring-[#A6C5D7]/30" />
          )}

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#F0F4FF] truncate text-sm">
              {otherProfile?.name || 'Chat'}
            </p>
            {otherProfile && (
              <p className="text-xs text-[#A6C5D7]/70 truncate">
                {otherProfile.branch} &middot; {otherProfile.year}
              </p>
            )}
          </div>
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#A6C5D7]"
          >
            &#8942;
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-10 right-0 z-20 bg-[#000926] rounded-xl shadow-xl border border-white/10 w-44 overflow-hidden">
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-3 text-sm text-left text-[#A6C5D7] active:bg-white/5 transition"
                >
                  Report {otherProfile?.name || 'user'}
                </button>
                <div className="h-px bg-white/10" />
                <button
                  onClick={handleBlock}
                  className="w-full px-4 py-3 text-sm text-left text-red-400 active:bg-white/5 transition"
                >
                  Block {otherProfile?.name || 'user'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-br-sm'
                    : 'bg-white/10 text-[#F0F4FF] rounded-bl-sm border border-white/10'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 outline-none focus:border-[#A6C5D7]/50 transition text-sm resize-none max-h-32 text-[#F0F4FF] placeholder-[#A6C5D7]/50"
            style={{ height: 'auto', minHeight: 40 }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-[#0F52BA] text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>

      {showProfile && (
        <UserProfileModal
          profile={otherProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}

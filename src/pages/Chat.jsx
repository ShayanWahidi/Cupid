import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeftIcon, PaperAirplaneIcon, EllipsisVerticalIcon, FlagIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import logo from '../assets/logo.png'
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
  const [otherTyping, setOtherTyping] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const typingAutoHideRef = useRef(null)

  useEffect(() => {
    if (!user || !matchId) return
    initChat()
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (typingAutoHideRef.current) clearTimeout(typingAutoHideRef.current)
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

    console.log('Initial messages fetched:', msgRows)
    setMessages(msgRows || [])
    setLoading(false)

    console.log('Setting up realtime channel for match:', matchId)
    supabase
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
          console.log('New message received:', payload)
          if (payload.new.sender_id !== user.id) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('Message deleted:', payload)
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
        }
      )
      .subscribe((status) => {
        console.log('Messages channel status:', status)
      })

    console.log('Setting up typing channel for match:', matchId)
    supabase
      .channel(`typing:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'typing_status',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('Typing insert received:', payload)
          if (payload.new.user_id !== user.id) {
            setOtherTyping(true)
            if (typingAutoHideRef.current) clearTimeout(typingAutoHideRef.current)
            typingAutoHideRef.current = setTimeout(() => {
              setOtherTyping(false)
              typingAutoHideRef.current = null
            }, 5000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'typing_status',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('Typing delete received:', payload)
          if (typingAutoHideRef.current) clearTimeout(typingAutoHideRef.current)
          setOtherTyping(false)
        }
      )
      .subscribe((status) => {
        console.log('Typing channel status:', status)
      })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleTyping = () => {
    if (!typingTimeoutRef.current) {
      console.log('User typing, inserting into typing_status...')
      supabase.from('typing_status').insert({
        user_id: user.id,
        match_id: matchId,
      }).then(({ error }) => {
        if (error && error.code !== '23505') {
          console.error('Typing insert error:', error)
        }
      })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      console.log('Typing timeout expired, deleting typing_status...')
      supabase.from('typing_status')
        .delete()
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .then(() => {})
      typingTimeoutRef.current = null
    }, 3000)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    supabase.from('typing_status')
      .delete()
      .eq('user_id', user.id)
      .eq('match_id', matchId)
      .then(() => {})

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
          <ArrowLeftIcon className="w-5 h-5 text-[#D6E6F3]" />
        </button>

        <img src={logo} alt="Cupid" className="h-12 w-12 rounded-full drop-shadow-lg shrink-0" />

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
            <p className="font-sora font-bold text-[#F0F4FF] truncate text-sm">
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
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-10 right-0 z-20 bg-[#000926] rounded-xl shadow-xl border border-white/10 w-44 overflow-hidden">
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-3 text-sm text-left text-[#A6C5D7] active:bg-white/5 transition flex items-center gap-2"
                >
                  <FlagIcon className="w-4 h-4" />
                  Report {otherProfile?.name || 'user'}
                </button>
                <div className="h-px bg-white/10" />
                <button
                  onClick={handleBlock}
                  className="w-full px-4 py-3 text-sm text-left text-red-400 active:bg-white/5 transition flex items-center gap-2"
                >
                  <NoSymbolIcon className="w-4 h-4" />
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
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-pjs leading-relaxed ${
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

      {otherTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex justify-start px-4 pb-2"
        >
          {console.log('Showing typing indicator for:', otherProfile?.name)}
          <div className="bg-white/10 rounded-2xl rounded-bl-sm border border-white/10 px-5 py-3">
            <span className="inline-flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 bg-[#A6C5D7] rounded-full inline-block"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </span>
          </div>
        </motion.div>
      )}

      <div className="border-t border-white/10 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 outline-none focus:border-[#A6C5D7]/50 transition text-sm font-pjs resize-none max-h-32 text-[#F0F4FF] placeholder-[#A6C5D7]/50"
            style={{ height: 'auto', minHeight: 40 }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
              handleTyping()
            }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-[#0F52BA] text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
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

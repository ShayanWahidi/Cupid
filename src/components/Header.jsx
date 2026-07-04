import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { BellIcon, HeartIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import UserProfileModal from './UserProfileModal'
import logo from '../assets/logo.png'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function Header() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notif.id)
      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        )
      }
    }
    if (notif.from_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', notif.from_user_id)
        .single()
      if (profile) {
        setSelectedProfile(profile)
        setShowPanel(false)
      }
    }
  }

  return (
    <>
      <div className="flex items-center justify-between h-14 px-6 shrink-0 bg-[#000926]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Cupid" className="h-12 w-12 rounded-full drop-shadow-lg" />
          <h1 className="font-sora font-bold text-[#F0F4FF] text-xl">Cupid</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowPanel((prev) => !prev)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition text-[#A6C5D7]"
          >
            <BellIcon className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute top-10 right-0 z-50 w-80 max-w-[calc(100vw-32px)] bg-[#000926]/95 backdrop-blur-xl rounded-2xl border border-white/10 max-h-[70dvh] overflow-y-auto"
              >
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-pjs font-semibold text-[#F0F4FF]">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#A6C5D7]/60">
                    No notifications yet
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notif={notif}
                        onClick={() => handleNotificationClick(notif)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {selectedProfile && (
        <UserProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </>
  )
}

function NotificationItem({ notif, onClick }) {
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    if (!notif.from_user_id) return
    supabase.from('profiles').select('name, photos').eq('user_id', notif.from_user_id).single()
      .then(({ data }) => {
        if (data) setProfile(data)
      })
  }, [notif.from_user_id])

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
        !notif.read ? 'bg-[#0F52BA]/20 border-l-2 border-[#A6C5D7]' : 'bg-white/5'
      } rounded-xl mx-2 my-1`}
    >
      {profile?.photos?.[0] ? (
        <img src={profile.photos[0]} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#A6C5D7]" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/10 shrink-0 ring-2 ring-[#A6C5D7]/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-pjs text-[#F0F4FF] leading-snug">
          {notif.type === 'match'
            ? <>You matched with {profile?.name || 'someone'}! <HeartIcon className="w-3.5 h-3.5 inline text-[#A6C5D7]" /></>
            : notif.type}
        </p>
        <p className="text-xs font-pjs text-[#A6C5D7]/60 mt-0.5">
          {timeAgo(notif.created_at)}
        </p>
      </div>
    </button>
  )
}

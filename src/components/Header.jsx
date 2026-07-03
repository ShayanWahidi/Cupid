import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import UserProfileModal from './UserProfileModal'

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
      <div className="flex items-center justify-between h-14 px-6 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">JSSpark</h1>

        <div className="relative">
          <button
            onClick={() => setShowPanel((prev) => !prev)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg leading-none active:bg-gray-100 transition"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
              <div className="absolute top-10 right-0 z-50 w-80 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[70dvh] overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
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
              </div>
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
      className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition ${
        !notif.read ? 'bg-pink-50' : ''
      }`}
    >
      {profile?.photos?.[0] ? (
        <img src={profile.photos[0]} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 leading-snug">
          {notif.type === 'match'
            ? `You matched with ${profile?.name || 'someone'}! 💜`
            : notif.type}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {timeAgo(notif.created_at)}
        </p>
      </div>
    </button>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { SparklesIcon, HeartIcon, UserIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { useUnreadMessages } from '../hooks/useUnreadMessages'

const tabs = [
  { path: '/swipe', label: 'Swipe', icon: SparklesIcon },
  { path: '/matches', label: 'Matches', icon: HeartIcon },
  { path: '/profile', label: 'Profile', icon: UserIcon },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { totalUnread } = useUnreadMessages(user)

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-[#000926]/90 backdrop-blur-md border-t border-white/10 z-40">
      <div className="flex items-center justify-around h-full px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path
          const isMatches = tab.path === '/matches'
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-20 h-full rounded-xl transition ${
                active ? 'text-[#A6C5D7]' : 'text-[#A6C5D7]/40'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-6 h-6" />
                {isMatches && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-pjs font-medium ${active ? 'text-[#A6C5D7]' : 'text-[#A6C5D7]/40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

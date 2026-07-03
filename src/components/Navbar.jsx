import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/swipe', label: 'Swipe', icon: '🔥' },
  { path: '/matches', label: 'Matches', icon: '💜' },
  { path: '/profile', label: 'Profile', icon: '👤' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-[#000926]/90 backdrop-blur-md border-t border-white/10 z-40">
      <div className="flex items-center justify-around h-full px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-20 h-full rounded-xl transition ${
                active ? 'text-[#A6C5D7] drop-shadow-[0_0_8px_#A6C5D7]' : 'text-[#A6C5D7]/40'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${active ? 'text-[#A6C5D7]' : 'text-[#A6C5D7]/40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

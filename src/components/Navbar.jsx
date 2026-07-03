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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white border-t border-gray-100 z-40">
      <div className="flex items-center justify-around h-full px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-20 h-full rounded-xl transition ${
                active ? 'text-pink-500' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${active ? 'text-pink-500' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

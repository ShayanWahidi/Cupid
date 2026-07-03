import { useNavigate } from 'react-router-dom'
import { useMatchContext } from '../context/MatchContext'

export default function MatchModal() {
  const { showMatch, matchedUser, dismissMatch } = useMatchContext()
  const navigate = useNavigate()

  if (!showMatch || !matchedUser) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl w-full max-w-sm px-8 py-10 text-center">
        <h2 className="text-3xl font-bold text-red-500 mb-1">It&apos;s a Match!</h2>
        <p className="text-gray-500 mb-6">
          You and {matchedUser.name} liked each other
        </p>

        {matchedUser.photos?.[0] && (
          <img
            src={matchedUser.photos[0]}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-red-200"
          />
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={dismissMatch}
            className="w-full bg-black text-white rounded-xl py-3.5 font-medium active:opacity-90 transition"
          >
            Keep Swiping
          </button>
          <button
            onClick={() => {
              dismissMatch()
              navigate('/matches')
            }}
            className="w-full border border-gray-300 rounded-xl py-3.5 font-medium active:bg-gray-50 transition"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}

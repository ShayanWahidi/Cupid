import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useMatchContext } from '../context/MatchContext'
import BlurText from './BlurText'

export default function MatchModal() {
  const { showMatch, matchedUser, dismissMatch } = useMatchContext()
  const navigate = useNavigate()

  if (!showMatch || !matchedUser) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#000926]/95 backdrop-blur-md flex items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm px-8 py-10 text-center"
      >
          <h1 className="font-sora font-bold text-4xl text-[#D6E6F3]">It's a Match! 💙</h1>
        <p className="font-pjs text-[#A6C5D7] mb-6 mt-2">
          You and {matchedUser.name} liked each other
        </p>

        {matchedUser.photos?.[0] && (
          <img
            src={matchedUser.photos[0]}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mb-6 ring-4 ring-[#A6C5D7]"
          />
        )}

        <div className="flex flex-col gap-3">
          <motion.button
            onClick={dismissMatch}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-3.5 font-pjs font-semibold transition"
          >
            Keep Swiping
          </motion.button>
          <motion.button
            onClick={() => {
              dismissMatch()
              navigate('/matches')
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full border border-[#A6C5D7]/30 text-[#A6C5D7] rounded-2xl py-3.5 font-pjs font-semibold active:bg-white/5 transition"
          >
            Send Message
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

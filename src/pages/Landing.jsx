import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import PixelSnow from '../components/PixelSnow'

const cards = [
  { text: "Ready to fall in love?", next: 1 },
  { text: "Or maybe just look around some options?", next: 2 },
  { text: "Or maybe make some really good friends?", sub: "we don't judge", next: null }
]

export default function Landing() {
  const { user, loading, checkProfileExists } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!loading && user) {
      checkProfileExists(user.id).then((exists) => {
        navigate(exists ? '/swipe' : '/setup', { replace: true })
      })
    }
  }, [user, loading])

  if (loading || user) return null

  return (
    <div className="relative min-h-dvh bg-[#000926] overflow-hidden flex flex-col max-w-[430px] mx-auto w-full">
      <PixelSnow color="#A6C5D7" density={0.2} speed={0.8} flakeSize={0.008} minFlakeSize={1.25} pixelResolution={200} variant="square" className="absolute inset-0 z-0" />
      
      <div className="relative z-10 w-full h-dvh flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col justify-between p-6"
          >
            <div className="flex flex-col items-start text-left pt-16">
              <h1 className="font-sora text-5xl font-bold text-[#F0F4FF] leading-tight max-w-[120px]">
                {cards[current].text}
              </h1>
              {cards[current].sub && (
                <p className="font-pjs text-[#A6C5D7]/70 text-base mt-4">{cards[current].sub}</p>
              )}
            </div>
            
            <div className="w-full flex flex-col gap-4 pb-12">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-4 font-pjs font-semibold text-lg"
              >
                {current < 2 ? "Yes" : "Okay, Let's go"}
              </motion.button>
              
              {current < 2 && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCurrent(current + 1)}
                  className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-4 font-pjs font-semibold text-lg"
                >
                  {current === 0 ? "Not really" : "Maybe"}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 w-full flex justify-center gap-2 z-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              i === current ? 'bg-[#A6C5D7]' : 'bg-[#A6C5D7]/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import BlurText from '../components/BlurText'
import PixelSnow from '../components/PixelSnow'

export default function Landing() {
  const { user, loading, signInWithGoogle, checkProfileExists } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      checkProfileExists(user.id).then((exists) => {
        navigate(exists ? '/swipe' : '/setup', { replace: true })
      })
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#000926]">
        <div className="w-6 h-6 border-2 border-[#A6C5D7]/30 border-t-[#A6C5D7] rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="relative flex flex-col min-h-dvh bg-[#000926] overflow-hidden">
      <PixelSnow color="#A6C5D7" density={0.2} speed={0.8} flakeSize={0.008} minFlakeSize={1.25} pixelResolution={200} variant="square" className="absolute inset-0 z-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6"
      >
        <BlurText text="JSSpark" className="font-['Pacifico'] text-5xl text-[#D6E6F3] justify-center" delay={150} />
        <BlurText text="Find your spark at JSSATE" className="text-[#A6C5D7] text-lg justify-center font-['DM_Sans'] mt-2 mb-12" delay={100} />
        <button
          onClick={signInWithGoogle}
          className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-3 font-medium active:opacity-90 transition"
        >
          Continue with Google
        </button>
        <div className="flex items-center gap-3 w-full my-4">
          <div className="flex-1 h-px bg-[#A6C5D7]/30" />
          <span className="text-sm text-[#A6C5D7]">or</span>
          <div className="flex-1 h-px bg-[#A6C5D7]/30" />
        </div>
        <Link
          to="/login"
          className="w-full text-center border border-[#A6C5D7]/30 text-[#D6E6F3] rounded-2xl py-3 font-medium active:bg-white/5 transition"
        >
          Log in with email
        </Link>
      </motion.div>
      <p className="relative z-10 text-center text-sm text-[#A6C5D7]/60 pb-8">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-[#D6E6F3] underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

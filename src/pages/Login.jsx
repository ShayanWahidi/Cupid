import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import BlurText from '../components/BlurText'

export default function Login() {
  const { user, loading, signIn, signInWithGoogle, checkProfileExists } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: authError } = await signIn(email, password)

    if (authError) {
      setError(authError.message)
      setSubmitting(false)
      return
    }

    const exists = await checkProfileExists(data.user.id)
    navigate(exists ? '/swipe' : '/setup', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-[#000926] to-[#0F52BA] px-6">
      <motion.button
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-9 h-9 flex items-center justify-center rounded-full mt-3 -ml-1 shrink-0"
      >
        <svg className="w-5 h-5 text-[#D6E6F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </motion.button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col justify-center"
      >
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6">
          <BlurText text="Welcome back" className="font-['Pacifico'] text-2xl text-[#D6E6F3] justify-center" delay={150} />
          <p className="text-[#A6C5D7] text-center mb-6 mt-1">Log in to your account</p>
          <motion.button
            onClick={signInWithGoogle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 border border-[#A6C5D7]/30 bg-white/5 rounded-2xl py-3.5 mb-4 font-medium text-[#F0F4FF] active:bg-white/10 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </motion.button>
          <div className="flex items-center gap-3 w-full mb-4">
            <div className="flex-1 h-px bg-[#A6C5D7]/30" />
            <span className="text-sm text-[#A6C5D7]">or</span>
            <div className="flex-1 h-px bg-[#A6C5D7]/30" />
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base text-[#F0F4FF] placeholder-[#A6C5D7]/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base text-[#F0F4FF] placeholder-[#A6C5D7]/50"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-3.5 font-medium disabled:opacity-50 transition"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </motion.button>
          </form>
        </div>
      </motion.div>
      <p className="text-center text-sm text-[#A6C5D7]/60 pb-8">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-[#D6E6F3] underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import BlurText from '../components/BlurText'

export default function Signup() {
  const { user, loading, signUp, checkProfileExists } = useAuth()
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

    const { data, error: authError } = await signUp(email, password)

    if (authError) {
      setError(authError.message)
      setSubmitting(false)
      return
    }

    if (!data.session) {
      setError('Check your email for the confirmation link.')
      setSubmitting(false)
      return
    }

    const exists = await checkProfileExists(data.user.id)
    navigate(exists ? '/swipe' : '/setup', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-[#000926] to-[#0F52BA] px-6">
      <motion.button
        onClick={() => navigate('/login')}
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
          <BlurText text="Create account" className="font-['Pacifico'] text-2xl text-[#D6E6F3] justify-center" delay={150} />
          <p className="text-[#A6C5D7] text-center mb-6 mt-1">Sign up to get started</p>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
              {submitting ? 'Creating account…' : 'Sign up'}
            </motion.button>
          </form>
        </div>
      </motion.div>
      <p className="text-center text-sm text-[#A6C5D7]/60 pb-8">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[#D6E6F3] underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

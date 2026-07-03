import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
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
    <div className="flex flex-col min-h-dvh px-6">
      <button
        onClick={() => navigate('/')}
        className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition mt-3 -ml-1 shrink-0"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-gray-400 mb-8">Sign up to get started</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white rounded-xl py-3.5 font-medium active:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-400 pb-8">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-black underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

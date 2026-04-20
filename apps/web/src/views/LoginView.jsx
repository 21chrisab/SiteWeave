import React from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import LoadingSpinner from '../components/LoadingSpinner'

function getRedirectUrl() {
  return window.location.origin
}

export default function LoginView() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setIsLoading(false)
      return
    }
    navigate('/')
  }

  const onOAuth = async (provider) => {
    setError(null)
    setIsLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getRedirectUrl() },
    })
    if (oauthError) {
      setError(oauthError.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full app-card p-8 space-y-6 shadow-lg">
        <div>
          <h1 className="app-section-title text-2xl">Sign in to SiteWeave</h1>
          <p className="app-section-subtitle mt-1">Standalone web workspace</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={isLoading} className="w-full app-action-primary rounded-lg py-2.5 font-medium disabled:opacity-60">
            {isLoading ? <LoadingSpinner size="sm" text="" /> : 'Sign In'}
          </button>
        </form>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onOAuth('google')} className="app-action-secondary rounded-lg py-2 text-sm disabled:opacity-60" disabled={isLoading}>
            Google
          </button>
          <button type="button" onClick={() => onOAuth('azure')} className="app-action-secondary rounded-lg py-2 text-sm disabled:opacity-60" disabled={isLoading}>
            Microsoft
          </button>
        </div>
      </div>
    </div>
  )
}

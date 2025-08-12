import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LogIn } from 'lucide-react'

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setLoading(false)
    if (error) setMessage(error.message)
    else setMessage('Check your email for the magic link.')
  }

  async function signInWithProvider(provider: 'google' | 'github' | 'discord') {
    if (!supabase) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider })
    setLoading(false)
    if (error) setMessage(error.message)
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/60 p-6 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-4">
          <LogIn className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-bold">Sign in to Habit Mastery RPG</h1>
        </div>
        <form onSubmit={signInWithEmail} className="space-y-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-slate-700 outline-none ring-2 ring-transparent focus:ring-purple-500" placeholder="you@example.com" />
          <button disabled={loading || !email} className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-600 font-medium disabled:opacity-50">Send Magic Link</button>
        </form>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={() => signInWithProvider('google')} className="py-2 rounded-lg bg-slate-700 hover:bg-slate-600">Google</button>
          <button onClick={() => signInWithProvider('github')} className="py-2 rounded-lg bg-slate-700 hover:bg-slate-600">GitHub</button>
          <button onClick={() => signInWithProvider('discord')} className="py-2 rounded-lg bg-slate-700 hover:bg-slate-600">Discord</button>
        </div>
        {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
      </div>
    </div>
  )
}

export default SignIn


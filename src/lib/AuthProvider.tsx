import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type AuthContextValue = {
  user: { id: string; email?: string | null } | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function init() {
      if (!supabase) {
        setLoading(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null)
      setLoading(false)
    }
    init()
    if (!supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })
    return () => {
      isMounted = false
      sub?.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}


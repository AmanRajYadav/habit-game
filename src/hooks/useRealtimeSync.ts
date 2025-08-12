import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

type Tables = 'habits' | 'daily_logs' | 'achievements' | 'profiles'

export function useRealtimeSync<T = any>({ table, onInsert, onUpdate, onDelete, filter }: {
  table: Tables
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: T) => void
}) {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    if (!supabase) return
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, (payload: any) => mounted.current && onInsert?.(payload))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, (payload: any) => mounted.current && onUpdate?.(payload))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table, filter }, (payload: any) => mounted.current && onDelete?.(payload))
      .subscribe()
    return () => {
      mounted.current = false
      supabase?.removeChannel(channel)
    }
  }, [table, filter, onInsert, onUpdate, onDelete])
}


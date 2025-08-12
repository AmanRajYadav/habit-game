import { supabase } from '../lib/supabaseClient'

export async function upsertHabit(habit: any) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.from('habits').upsert(habit).select().single()
}

export async function fetchHabits(userId: string) {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') }
  return await supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true })
}

export async function deleteHabit(id: string, userId: string) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.from('habits').delete().eq('id', id).eq('user_id', userId)
}

export async function upsertDailyLog(log: any) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.from('daily_logs').upsert(log).select().single()
}

export async function fetchDailyLogs(userId: string) {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') }
  return await supabase.from('daily_logs').select('*').eq('user_id', userId)
}

export async function upsertProfile(profile: any) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.from('profiles').upsert(profile).select().single()
}

export async function fetchProfile(userId: string) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  return await supabase.from('profiles').select('*').eq('id', userId).single()
}


export async function fetchAchievements(userId: string) {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') }
  return await supabase.from('achievements').select('*').eq('user_id', userId)
}

export async function upsertAchievement(achievement: any) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.from('achievements').upsert(achievement).select().single()
}

// Weekly challenges
export async function fetchActiveChallenges(rangeStart: string, rangeEnd: string) {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') }
  return await supabase
    .from('weekly_challenges')
    .select('*')
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)
}

export async function upsertUserChallengeProgress(row: any) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.from('user_challenge_progress').upsert(row).select().single()
}

export async function getWeeklyLeaderboard(rangeStart: string, rangeEnd: string) {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') }
  return await supabase.rpc('get_weekly_leaderboard', { start_date: rangeStart, end_date: rangeEnd })
}


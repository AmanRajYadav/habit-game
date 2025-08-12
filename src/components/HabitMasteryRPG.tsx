import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Trophy, Flame, Star, Target, Sparkles, Award, TrendingUp, Check, X, Shield, Heart, Brain, Users, Palette, Edit3, Pause, Play, Trash2
} from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import { fetchHabits, fetchDailyLogs, fetchProfile, upsertProfile, upsertHabit, upsertDailyLog, fetchAchievements, upsertAchievement, deleteHabit, fetchActiveChallenges, getWeeklyLeaderboard } from '../services/db'
import { useRealtimeSync } from '../hooks/useRealtimeSync'
import InstallPWAButton from './InstallPWAButton'

type Habit = {
  id: string
  name: string
  category: keyof typeof categoryConfig
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic'
  xpValue: number
  streakCount: number
  bestStreak: number
  totalCompletions: number
  lastCompleted: string | null
  createdDate: string
  status: 'Active' | 'Paused' | 'Archived'
}

type DailyLogs = Record<string, { habits: string[]; totalXP: number; perfectBonusApplied?: boolean }>

type PlayerStats = {
  level: number
  currentXP: number
  totalXP: number
  currentStreak: number
  bestStreak: number
}

const levelRequirements = [
  { level: 1, name: 'Novice', minXP: 0, maxXP: 100, color: 'text-gray-400' },
  { level: 2, name: 'Apprentice', minXP: 101, maxXP: 250, color: 'text-green-400' },
  { level: 3, name: 'Adept', minXP: 251, maxXP: 500, color: 'text-blue-400' },
  { level: 4, name: 'Expert', minXP: 501, maxXP: 1000, color: 'text-purple-400' },
  { level: 5, name: 'Master', minXP: 1001, maxXP: 2000, color: 'text-yellow-400' },
  { level: 6, name: 'Grandmaster', minXP: 2001, maxXP: 4000, color: 'text-orange-400' },
  { level: 7, name: 'Legend', minXP: 4001, maxXP: 8000, color: 'text-red-400' },
  { level: 8, name: 'Mythic', minXP: 8001, maxXP: 15000, color: 'text-pink-400' },
  { level: 9, name: 'Godlike', minXP: 15001, maxXP: 30000, color: 'text-indigo-400' },
  { level: 10, name: '∞ Infinite', minXP: 30001, maxXP: Number.POSITIVE_INFINITY, color: 'text-cyan-400' }
]

const achievementDefinitions = [
  { id: 'first_step', name: 'First Step', description: '1 day streak', icon: '👟', category: 'streak', condition: (stats: PlayerStats) => stats.currentStreak >= 1, xp: 10, rarity: 'common' },
  { id: 'week_warrior', name: 'Week Warrior', description: '7 day streak', icon: '⚔️', category: 'streak', condition: (stats: PlayerStats) => stats.currentStreak >= 7, xp: 50, rarity: 'rare' },
  { id: 'month_master', name: 'Month Master', description: '30 day streak', icon: '🏆', category: 'streak', condition: (stats: PlayerStats) => stats.currentStreak >= 30, xp: 200, rarity: 'epic' },
  { id: 'quarter_conqueror', name: 'Quarter Conqueror', description: '90 day streak', icon: '👑', category: 'streak', condition: (stats: PlayerStats) => stats.currentStreak >= 90, xp: 500, rarity: 'legendary' },
  { id: 'century_club', name: 'Century Club', description: 'Earn 100 XP', icon: '💯', category: 'xp', condition: (stats: PlayerStats) => stats.totalXP >= 100, xp: 25, rarity: 'common' },
  { id: 'thousand_thunder', name: 'Thousand Thunder', description: 'Earn 1000 XP', icon: '⚡', category: 'xp', condition: (stats: PlayerStats) => stats.totalXP >= 1000, xp: 100, rarity: 'rare' },
  { id: 'ten_k_titan', name: 'Ten K Titan', description: 'Earn 10,000 XP', icon: '🏰', category: 'xp', condition: (stats: PlayerStats) => stats.totalXP >= 10000, xp: 500, rarity: 'epic' },
  { id: 'habit_stacker', name: 'Habit Stacker', description: 'Complete 5+ habits in one day', icon: '📚', category: 'special', condition: null, xp: 30, rarity: 'rare' },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Complete all habits for 7 days', icon: '🌟', category: 'special', condition: null, xp: 100, rarity: 'epic' },
  { id: 'comeback_kid', name: 'Comeback Kid', description: 'Restart after a break', icon: '🔥', category: 'special', condition: null, xp: 50, rarity: 'rare' }
] as const

// Extra achievements
// Milestones
const extraAchievements = [
  { id: 'streak_15', name: 'Hot Streak', description: '15 day streak', icon: '🔥', category: 'streak', condition: (s: PlayerStats) => s.currentStreak >= 15, xp: 120, rarity: 'rare' },
  { id: 'streak_60', name: 'Blazing Trail', description: '60 day streak', icon: '🌋', category: 'streak', condition: (s: PlayerStats) => s.currentStreak >= 60, xp: 300, rarity: 'epic' },
  { id: 'xp_5k', name: 'Five-K Club', description: 'Earn 5,000 XP', icon: '🥇', category: 'xp', condition: (s: PlayerStats) => s.totalXP >= 5000, xp: 250, rarity: 'rare' },
  { id: 'xp_25k', name: 'Quarter Legend', description: 'Earn 25,000 XP', icon: '🏅', category: 'xp', condition: (s: PlayerStats) => s.totalXP >= 25000, xp: 800, rarity: 'legendary' },
  { id: 'daily_10', name: 'Daily Dominator', description: 'Complete 10 quests in a day', icon: '🎯', category: 'special', condition: null, xp: 120, rarity: 'epic' },
] as const

const categoryConfig = {
  Health: { icon: Heart, color: 'bg-red-500', lightColor: 'bg-red-100' },
  Mind: { icon: Brain, color: 'bg-purple-500', lightColor: 'bg-purple-100' },
  Work: { icon: Target, color: 'bg-blue-500', lightColor: 'bg-blue-100' },
  Social: { icon: Users, color: 'bg-green-500', lightColor: 'bg-green-100' },
  Creative: { icon: Palette, color: 'bg-yellow-500', lightColor: 'bg-yellow-100' }
}

function getStreakMultiplier(streak: number) {
  if (streak >= 101) return 3
  if (streak >= 61) return 2.5
  if (streak >= 31) return 2
  if (streak >= 15) return 1.5
  if (streak >= 8) return 1.2
  return 1
}

const HabitMasteryRPG: React.FC = () => {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habitRPG_habits')
    return saved ? JSON.parse(saved) : []
  })
  const [dailyLogs, setDailyLogs] = useState<DailyLogs>(() => {
    const saved = localStorage.getItem('habitRPG_dailyLogs')
    return saved ? JSON.parse(saved) : {}
  })
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('habitRPG_playerStats')
    return saved
      ? JSON.parse(saved)
      : { level: 1, currentXP: 0, totalXP: 0, currentStreak: 0, bestStreak: 0 }
  })
  const [achievements, setAchievements] = useState<any[]>(() => {
    const saved = localStorage.getItem('habitRPG_achievements')
    return saved ? JSON.parse(saved) : []
  })

  const [showAddHabit, setShowAddHabit] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showAchievements, setShowAchievements] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'achievement' | 'xp' } | null>(null)
  const [activeTab, setActiveTab] = useState<'daily' | 'habits' | 'stats'>('daily')
  const [challenges, setChallenges] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<{ user_id: string; total_xp: number }[]>([])

  const getCurrentLevel = useCallback(() => {
    return (
      levelRequirements.find(
        (l) => playerStats.totalXP >= l.minXP && playerStats.totalXP <= l.maxXP,
      ) || levelRequirements[0]
    )
  }, [playerStats.totalXP])

  const getXPToNextLevel = useCallback(() => {
    const currentLevel = getCurrentLevel()
    if (currentLevel.level === 10) return 0
    return currentLevel.maxXP - playerStats.totalXP + 1
  }, [getCurrentLevel, playerStats.totalXP])

  const getLevelProgress = useCallback(() => {
    const currentLevel = getCurrentLevel()
    if (currentLevel.level === 10) return 100
    const levelXP = playerStats.totalXP - currentLevel.minXP
    const levelRange = currentLevel.maxXP - currentLevel.minXP + 1
    return Math.min(100, (levelXP / levelRange) * 100)
  }, [getCurrentLevel, playerStats.totalXP])

  // Keep numeric level in sync with total XP derived level for display badges
  useEffect(() => {
    const derived = getCurrentLevel().level
    if (playerStats.level !== derived) {
      setPlayerStats((prev) => ({ ...prev, level: derived }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerStats.totalXP, getCurrentLevel])

  const showNotificationMsg = (message: string, type: 'success' | 'achievement' | 'xp' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const checkAchievements = useCallback(
    (newStats: PlayerStats, dailyCompletions = 0) => {
      const newAchievements: any[] = []
      const allDefs = [...achievementDefinitions, ...extraAchievements]
      allDefs.forEach((def) => {
        if (!achievements.find((a) => a.id === def.id)) {
          let unlocked = false
          if (def.condition) {
            unlocked = def.condition(newStats as PlayerStats)
          } else if (def.id === 'habit_stacker' && dailyCompletions >= 5) {
            unlocked = true
          } else if (def.id === 'daily_10' && dailyCompletions >= 10) {
            unlocked = true
          }
          if (unlocked) {
            newAchievements.push({ ...def, unlockedDate: new Date().toISOString() })
            showNotificationMsg(`🏆 Achievement Unlocked: ${def.name}!`, 'achievement')
          }
        }
      })
      if (newAchievements.length > 0) {
        setAchievements((prev) => [...prev, ...newAchievements])
        const achievementXP = newAchievements.reduce((sum, a) => sum + a.xp, 0)
        if (achievementXP > 0) {
          setPlayerStats((prev) => ({ ...prev, totalXP: prev.totalXP + achievementXP, currentXP: prev.currentXP + achievementXP }))
        }
        // Persist remotely
        if (user) {
          for (const a of newAchievements) {
            void upsertAchievement({ user_id: user.id, key: a.id, name: a.name, xp: a.xp })
          }
        }
      }
    },
    [achievements, user],
  )

  function addHabit(habitData: Pick<Habit, 'name' | 'category' | 'difficulty' | 'xpValue'>) {
    const newHabit: Habit = {
      id: (globalThis.crypto?.randomUUID?.() ?? Date.now().toString()),
      ...habitData,
      streakCount: 0,
      bestStreak: 0,
      totalCompletions: 0,
      lastCompleted: null,
      createdDate: new Date().toISOString(),
      status: 'Active'
    }
    setHabits((prev) => [...prev, newHabit])
    if (user) {
      void upsertHabit({
        id: newHabit.id,
        user_id: user.id,
        name: newHabit.name,
        category: newHabit.category,
        difficulty: newHabit.difficulty,
        xp_value: newHabit.xpValue,
        streak_count: newHabit.streakCount,
        best_streak: newHabit.bestStreak,
        total_completions: newHabit.totalCompletions,
        last_completed: newHabit.lastCompleted,
        status: newHabit.status,
      })
    }
    setShowAddHabit(false)
    showNotificationMsg(`New quest added: ${habitData.name}!`)
  }

  async function updateHabitStatus(id: string, status: Habit['status']) {
    const prev = habits
    const next = habits.map(h => h.id === id ? { ...h, status } : h)
    setHabits(next)
    if (user) {
      const target = next.find(h => h.id === id)!
      const { error } = await upsertHabit({
        id: target.id,
        user_id: user.id,
        name: target.name,
        category: target.category,
        difficulty: target.difficulty,
        xp_value: target.xpValue,
        streak_count: target.streakCount,
        best_streak: target.bestStreak,
        total_completions: target.totalCompletions,
        last_completed: target.lastCompleted,
        status: target.status,
      })
      if (error) {
        setHabits(prev)
        showNotificationMsg('Failed to update habit status', 'success')
      }
    }
  }

  async function removeHabit(id: string) {
    const prev = habits
    setHabits(prev.filter(h => h.id !== id))
    if (user) {
      const { error } = await deleteHabit(id, user.id)
      if (error) {
        setHabits(prev)
        showNotificationMsg('Failed to delete habit', 'success')
      }
    }
  }

  async function saveHabitEdits(updated: Habit) {
    const prev = habits
    setHabits(habits.map(h => h.id === updated.id ? updated : h))
    setEditHabit(null)
    if (user) {
      const { error } = await upsertHabit({
        id: updated.id,
        user_id: user.id,
        name: updated.name,
        category: updated.category,
        difficulty: updated.difficulty,
        xp_value: updated.xpValue,
        streak_count: updated.streakCount,
        best_streak: updated.bestStreak,
        total_completions: updated.totalCompletions,
        last_completed: updated.lastCompleted,
        status: updated.status,
      })
      if (error) {
        setHabits(prev)
        showNotificationMsg('Failed to save changes', 'success')
      }
    }
  }

  function toggleHabitCompletion(habitId: string) {
    const today = selectedDate
    const todayLog: DailyLogs[string] = dailyLogs[today] ?? { habits: [], totalXP: 0, perfectBonusApplied: false }
    const habit = habits.find((h) => h.id === habitId)
    if (!habit) return
    let newLog: DailyLogs[string]
    let xpChange = 0
    if (todayLog.habits.includes(habitId)) {
      newLog = { ...todayLog, habits: todayLog.habits.filter((id) => id !== habitId) }
      const multiplier = getStreakMultiplier(habit.streakCount)
      xpChange = -(habit.xpValue * multiplier)
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, streakCount: Math.max(0, h.streakCount - 1), totalCompletions: Math.max(0, h.totalCompletions - 1) } : h,
        ),
      )
    } else {
      newLog = { ...todayLog, habits: [...todayLog.habits, habitId] }
      const newStreakCount = habit.streakCount + 1
      const multiplier = getStreakMultiplier(newStreakCount)
      xpChange = habit.xpValue * multiplier
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? { ...h, streakCount: newStreakCount, bestStreak: Math.max(h.bestStreak, newStreakCount), totalCompletions: h.totalCompletions + 1, lastCompleted: today }
            : h,
        ),
      )
      showNotificationMsg(`+${xpChange} XP! (${multiplier}x multiplier)`, 'xp')
    }
    newLog.totalXP = newLog.habits.reduce((sum, hId) => {
      const found = habits.find((hb) => hb.id === hId)
      if (found) {
        const mult = getStreakMultiplier(found.streakCount)
        return sum + found.xpValue * mult
      }
      return sum
    }, 0)

    // Perfect day bonus (+50 XP) once per day when all active habits are completed
    const totalActive = habits.filter((h) => h.status === 'Active').length
    const isPerfectToday = totalActive > 0 && newLog.habits.length === totalActive
    if (isPerfectToday && !newLog.perfectBonusApplied) {
      newLog.perfectBonusApplied = true
      newLog.totalXP += 50
      xpChange += 50
      showNotificationMsg(`+50 XP Perfect Day Bonus!`, 'xp')
    }
    setDailyLogs((prev) => ({ ...prev, [today]: newLog }))
    if (user) {
      void upsertDailyLog({ user_id: user.id, date: today, habit_ids: newLog.habits, total_xp: newLog.totalXP, perfect_bonus_applied: newLog.perfectBonusApplied ?? false })
    }
    setPlayerStats((prev) => {
      const newStats = { ...prev, totalXP: prev.totalXP + xpChange, currentXP: prev.currentXP + xpChange }
      checkAchievements(newStats, newLog.habits.length)
      return newStats
    })
  }

  // Persist locally for offline
  useEffect(() => { localStorage.setItem('habitRPG_habits', JSON.stringify(habits)) }, [habits])
  useEffect(() => { localStorage.setItem('habitRPG_dailyLogs', JSON.stringify(dailyLogs)) }, [dailyLogs])
  useEffect(() => { localStorage.setItem('habitRPG_playerStats', JSON.stringify(playerStats)) }, [playerStats])
  useEffect(() => { localStorage.setItem('habitRPG_achievements', JSON.stringify(achievements)) }, [achievements])

  const dailyStats = useMemo(() => {
    const todayLog = dailyLogs[selectedDate] || { habits: [], totalXP: 0 }
    const completedCount = todayLog.habits.length
    const totalCount = habits.filter((h) => h.status === 'Active').length
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
    return { completed: completedCount, total: totalCount, completionRate, xpEarned: todayLog.totalXP }
  }, [dailyLogs, selectedDate, habits])

  // Weekly challenges & leaderboard
  useEffect(() => {
    async function loadWeekly() {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday
      const end = new Date(start)
      end.setDate(start.getDate() + 6) // Sunday
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]
      const [ch, lb] = await Promise.all([
        fetchActiveChallenges(startStr, endStr),
        getWeeklyLeaderboard(startStr, endStr),
      ])
      if (ch.data) setChallenges(ch.data as any[])
      if (Array.isArray(lb.data)) setLeaderboard(lb.data as any[])
    }
    loadWeekly()
  }, [])

  // Initial load from Supabase for authenticated users
  useEffect(() => {
    let active = true
    async function load() {
      if (!user) return
      const [hab, logs, profile, ach] = await Promise.all([
        fetchHabits(user.id),
        fetchDailyLogs(user.id),
        fetchProfile(user.id),
        fetchAchievements(user.id),
      ])
      if (!active) return
      if (hab.data) setHabits((hab.data as any[]).map((h) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        difficulty: h.difficulty,
        xpValue: h.xp_value,
        streakCount: h.streak_count,
        bestStreak: h.best_streak,
        totalCompletions: h.total_completions,
        lastCompleted: h.last_completed ?? null,
        createdDate: h.created_at,
        status: h.status,
      })))
      if (logs.data) {
        const mapped: any = {}
        for (const l of logs.data as any[]) {
          mapped[l.date] = { habits: l.habit_ids ?? [], totalXP: l.total_xp ?? 0, perfectBonusApplied: l.perfect_bonus_applied ?? false }
        }
        setDailyLogs(mapped)
      }
      if (profile.data) {
        setPlayerStats((prev) => ({ ...prev, level: profile.data.level ?? prev.level, totalXP: profile.data.total_xp ?? prev.totalXP, bestStreak: profile.data.best_streak ?? prev.bestStreak }))
      } else {
        await upsertProfile({ id: user.id })
      }
      if (ach.data) {
        // Merge stored achievements with local list
        const stored = new Set((ach.data as any[]).map((a) => a.key))
        const merged = achievementDefinitions.filter((d) => stored.has(d.id)).map((d) => ({ id: d.id, name: d.name, xp: d.xp, icon: d.icon, unlockedDate: new Date().toISOString() }))
        setAchievements(merged)
      }
    }
    load()
    return () => { active = false }
  }, [user])

  // Realtime sync subscriptions (no-op if not configured)
  useRealtimeSync({
    table: 'habits',
    filter: user ? `user_id=eq.${user?.id}` : undefined as any,
    onInsert: (payload: any) => {
      const h = payload?.new
      if (!h) return
      setHabits(curr => {
        const exists = curr.find(x => x.id === h.id)
        const mapped: Habit = {
          id: h.id,
          name: h.name,
          category: h.category,
          difficulty: h.difficulty,
          xpValue: h.xp_value,
          streakCount: h.streak_count,
          bestStreak: h.best_streak,
          totalCompletions: h.total_completions,
          lastCompleted: h.last_completed ?? null,
          createdDate: h.created_at,
          status: h.status,
        }
        if (exists) return curr.map(x => x.id === h.id ? mapped : x)
        return [...curr, mapped]
      })
    },
    onUpdate: (payload: any) => {
      const h = payload?.new
      if (!h) return
      setHabits(curr => curr.map(x => x.id === h.id ? {
        id: h.id,
        name: h.name,
        category: h.category,
        difficulty: h.difficulty,
        xpValue: h.xp_value,
        streakCount: h.streak_count,
        bestStreak: h.best_streak,
        totalCompletions: h.total_completions,
        lastCompleted: h.last_completed ?? null,
        createdDate: h.created_at,
        status: h.status,
      } : x))
    },
    onDelete: (payload: any) => {
      const oldId = payload?.old?.id
      if (!oldId) return
      setHabits(curr => curr.filter(h => h.id !== oldId))
    }
  })
  useRealtimeSync({
    table: 'daily_logs',
    filter: user ? `user_id=eq.${user?.id}` : undefined as any,
    onInsert: (payload: any) => {
      const l = payload?.new
      if (!l) return
      setDailyLogs(curr => ({ ...curr, [l.date]: { habits: l.habit_ids ?? [], totalXP: l.total_xp ?? 0, perfectBonusApplied: l.perfect_bonus_applied ?? false } }))
    },
    onUpdate: (payload: any) => {
      const l = payload?.new
      if (!l) return
      setDailyLogs(curr => ({ ...curr, [l.date]: { habits: l.habit_ids ?? [], totalXP: l.total_xp ?? 0, perfectBonusApplied: l.perfect_bonus_applied ?? false } }))
    },
    onDelete: (payload: any) => {
      const l = payload?.old
      if (!l) return
      setDailyLogs(curr => {
        const copy = { ...curr }
        delete (copy as any)[l.date]
        return copy
      })
    }
  })

  // Derive overall streak (consecutive days with at least 1 completion)
  useEffect(() => {
    let streak = 0
    for (let i = 0; i < 400; i++) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const log = dailyLogs[key]
      if (log && log.habits.length > 0) streak += 1
      else break
    }
    if (streak !== playerStats.currentStreak) {
      setPlayerStats((prev) => ({ ...prev, currentStreak: streak, bestStreak: Math.max(prev.bestStreak, streak) }))
    }
  }, [dailyLogs, playerStats.currentStreak])

  // Sync profile totals to Supabase
  useEffect(() => {
    if (!user) return
    void upsertProfile({ id: user.id, level: playerStats.level, total_xp: playerStats.totalXP, best_streak: playerStats.bestStreak })
  }, [user, playerStats.level, playerStats.totalXP, playerStats.bestStreak])

  const currentLevel = getCurrentLevel()

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-3 sm:p-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg ${
          notification.type === 'achievement' ? 'bg-yellow-500' : notification.type === 'xp' ? 'bg-purple-500' : 'bg-green-500'
        }`}>
          <p className="font-bold text-sm sm:text-base">{notification.message}</p>
        </div>
      )}

      <header className="mx-auto mb-6 max-w-5xl">
        <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 sm:p-6 backdrop-blur-lg">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent sm:text-4xl">Habit Mastery RPG</h1>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Transform your life into an epic adventure</p>
            </div>
            <div className="flex items-center gap-2">
              <InstallPWAButton />
              <button onClick={() => setShowAchievements((s) => !s)} className="rounded-xl bg-yellow-500/20 p-2 transition-all hover:bg-yellow-500/30 sm:p-3">
                <Trophy className="h-5 w-5 text-yellow-400 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/50 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 sm:h-12 sm:w-12">
                  <span className="text-lg font-bold sm:text-xl">{playerStats.level}</span>
                </div>
                <div>
                  <p className={`font-bold ${currentLevel.color}`}>{currentLevel.name}</p>
                  <p className="text-xs text-gray-400 sm:text-sm">{playerStats.totalXP} Total XP • {getXPToNextLevel()} to next level</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Flame className="h-4 w-4 text-orange-400 sm:h-5 sm:w-5" />
                  <span className="text-xs font-bold sm:text-base">{playerStats.currentStreak} day streak</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400 sm:h-5 sm:w-5" />
                  <span className="text-xs font-bold sm:text-base">{getStreakMultiplier(playerStats.currentStreak)}x</span>
                </div>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${getLevelProgress()}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto mb-4 max-w-5xl">
        <div className="flex gap-2 rounded-xl bg-slate-800/30 p-1 sm:p-2">
          {(['daily', 'habits', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
                activeTab === tab ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              {tab === 'daily' ? 'Daily Quests' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-5xl">
        {activeTab === 'daily' && (
          <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold sm:text-2xl">
                    <Target className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
                    Today's Quests
                  </h2>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-lg bg-slate-700 px-3 py-1 text-xs sm:text-sm" />
                </div>
                {habits.filter((h) => h.status === 'Active').length === 0 ? (
                  <div className="py-10 text-center sm:py-12">
                    <Shield className="mx-auto mb-4 h-12 w-12 text-gray-600 sm:h-16 sm:w-16" />
                    <p className="mb-4 text-sm text-gray-400 sm:text-base">No quests available</p>
                    <button onClick={() => setShowAddHabit(true)} className="rounded-lg bg-purple-500 px-4 py-2 transition-all hover:bg-purple-600">
                      Create Your First Quest
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits
                      .filter((h) => h.status === 'Active')
                      .map((habit) => {
                        const isCompleted = dailyLogs[selectedDate]?.habits.includes(habit.id)
                        const CategoryIcon = categoryConfig[habit.category].icon
                        const multiplier = getStreakMultiplier(habit.streakCount)
                        return (
                          <div
                            key={habit.id}
                            className={`cursor-pointer rounded-xl border p-4 transition-all ${
                              isCompleted ? 'border-green-500/30 bg-green-500/10' : 'border-slate-600/30 bg-slate-700/30 hover:bg-slate-700/50'
                            }`}
                            onClick={() => toggleHabitCompletion(habit.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${categoryConfig[habit.category].color}`}>
                                  <CategoryIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-bold">{habit.name}</p>
                                  <div className="mt-1 flex items-center gap-3">
                                    <span className="text-xs text-purple-400">{habit.xpValue * multiplier} XP</span>
                                    {habit.streakCount > 0 && (
                                      <span className="flex items-center gap-1 text-xs text-orange-400">
                                        <Flame className="h-3 w-3" />
                                        {habit.streakCount} days
                                      </span>
                                    )}
                                    {multiplier > 1 && <span className="text-xs text-yellow-400">{multiplier}x bonus</span>}
                                  </div>
                                </div>
                              </div>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-500'}`}>
                                {isCompleted && <Check className="h-4 w-4" />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
                <button onClick={() => setShowAddHabit(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/20 py-3 transition-all hover:bg-purple-500/30">
                  <Plus className="h-5 w-5" />
                  Add New Quest
                </button>
              </div>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold sm:text-xl">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Daily Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-400">Completion Rate</span>
                      <span className="font-bold">{Math.round(dailyStats.completionRate)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-700">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style={{ width: `${dailyStats.completionRate}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="rounded-lg bg-slate-700/30 p-3">
                      <p className="text-xs text-gray-400">Quests Done</p>
                      <p className="text-xl font-bold sm:text-2xl">{dailyStats.completed}/{dailyStats.total}</p>
                    </div>
                    <div className="rounded-lg bg-slate-700/30 p-3">
                      <p className="text-xs text-gray-400">XP Earned</p>
                      <p className="text-xl font-bold text-purple-400 sm:text-2xl">{dailyStats.xpEarned}</p>
                    </div>
                  </div>
                  {dailyStats.completionRate === 100 && dailyStats.total > 0 && (
                    <div className="rounded-lg border border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-3">
                      <p className="flex items-center gap-2 font-bold text-yellow-400">
                        <Star className="h-4 w-4" />
                        Perfect Day! +50 Bonus XP
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold sm:text-xl">
                  <Award className="h-5 w-5 text-yellow-400" />
                  Recent Achievements
                </h3>
                {achievements.slice(-3).reverse().map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <span className="text-2xl">{a.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-gray-400">+{a.xp} XP</p>
                    </div>
                  </div>
                ))}
                {achievements.length === 0 && <p className="text-sm text-gray-400">No achievements yet</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold sm:text-2xl">Habit Library</h2>
              <button onClick={() => setShowAddHabit(true)} className="flex items-center gap-2 rounded-lg bg-purple-500 px-3 py-2 text-sm transition-all hover:bg-purple-600 sm:px-4">
                <Plus className="h-4 w-4" /> New Habit
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {habits.map((habit) => {
                const CategoryIcon = categoryConfig[habit.category].icon
                return (
                  <div key={habit.id} className="rounded-xl border border-slate-600/30 bg-slate-700/30 p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${categoryConfig[habit.category].color}`}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`${habit.status === 'Active' ? 'bg-green-500/20 text-green-400' : habit.status === 'Paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'} rounded-full px-2 py-1 text-xs`}> {habit.status} </span>
                        <button onClick={() => setEditHabit(habit)} className="rounded-md p-1 hover:bg-slate-600/50" title="Edit"><Edit3 className="h-4 w-4" /></button>
                        {habit.status !== 'Paused' ? (
                          <button onClick={() => updateHabitStatus(habit.id, 'Paused')} className="rounded-md p-1 hover:bg-slate-600/50" title="Pause"><Pause className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => updateHabitStatus(habit.id, 'Active')} className="rounded-md p-1 hover:bg-slate-600/50" title="Resume"><Play className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => removeHabit(habit.id)} className="rounded-md p-1 hover:bg-slate-600/50" title="Delete"><Trash2 className="h-4 w-4 text-red-400" /></button>
                      </div>
                    </div>
                    <h3 className="mb-2 font-bold">{habit.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base XP:</span>
                        <span className="text-purple-400">{habit.xpValue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Streak:</span>
                        <span className="text-orange-400">{habit.streakCount} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best Streak:</span>
                        <span className="text-yellow-400">{habit.bestStreak} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Completions:</span>
                        <span>{habit.totalCompletions}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
              <h3 className="mb-4 text-lg font-bold sm:text-xl">Overall Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-400">Total XP:</span><span className="font-bold text-purple-400">{playerStats.totalXP}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Current Level:</span><span className={`font-bold ${currentLevel.color}`}>{currentLevel.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Best Streak:</span><span className="font-bold text-orange-400">{playerStats.bestStreak} days</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Achievements:</span><span className="font-bold text-yellow-400">{achievements.length}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
              <h3 className="mb-4 text-lg font-bold sm:text-xl">Category Focus</h3>
              <div className="space-y-3">
                {Object.entries(categoryConfig).map(([category, config]) => {
                  const categoryHabits = habits.filter((h) => h.category === (category as Habit['category']))
                  const completions = categoryHabits.reduce((sum, h) => sum + h.totalCompletions, 0)
                  const Icon = (config as any).icon
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${(config as any).color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-gray-400">{category}</span>
                      </div>
                      <span className="font-bold">{completions}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
              <h3 className="mb-4 text-lg font-bold sm:text-xl">This Week</h3>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date()
                  date.setDate(date.getDate() - (6 - i))
                  const dateStr = date.toISOString().split('T')[0]
                  const log = dailyLogs[dateStr]
                  const completed = log?.habits.length || 0
                  const total = habits.filter((h) => h.status === 'Active').length
                  const rate = total > 0 ? (completed / total) * 100 : 0
                  return (
                    <div key={i} className="text-center">
                      <p className="mb-1 text-xs text-gray-400">{date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}</p>
                      <div className={`${rate === 100 ? 'bg-green-500' : rate > 50 ? 'bg-yellow-500' : rate > 0 ? 'bg-orange-500' : 'bg-slate-700'} mx-auto flex h-8 w-8 items-center justify-center rounded-lg`}>
                        <span className="text-xs font-bold">{completed}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
              <h3 className="mb-4 text-lg font-bold sm:text-xl">This Week's Challenges</h3>
              {challenges.length === 0 ? (
                <p className="text-sm text-gray-400">No active challenges</p>
              ) : (
                <div className="space-y-3">
                  {challenges.map((c: any) => (
                    <div key={c.id} className="rounded-lg border border-slate-600/30 bg-slate-700/30 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{c.title}</p>
                          <p className="text-xs text-gray-400">{c.description}</p>
                        </div>
                        <span className="text-xs text-purple-300">Reward {c.reward_xp} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6 lg:col-span-3">
              <h3 className="mb-4 text-lg font-bold sm:text-xl">Weekly Leaderboard</h3>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-400">No entries yet</p>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {leaderboard.map((row, idx) => (
                    <div key={row.user_id + idx} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-sm text-gray-400">{idx + 1}</span>
                        <span className="text-sm">{row.user_id.slice(0, 8)}…</span>
                      </div>
                      <span className="font-bold text-purple-300">{row.total_xp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showAchievements && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-800 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold sm:text-2xl">
                <Trophy className="h-5 w-5 text-yellow-400 sm:h-6 sm:w-6" /> Achievement Gallery
              </h2>
              <button onClick={() => setShowAchievements(false)} className="rounded-lg p-2 transition-colors hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {achievementDefinitions.map((def) => {
                const unlocked = achievements.find((a) => a.id === def.id)
                const rarityColors: Record<string, string> = { common: 'border-gray-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-500' }
                return (
                  <div key={def.id} className={`rounded-xl border-2 p-4 ${unlocked ? `${rarityColors[def.rarity]} bg-slate-700/50` : 'border-slate-600 bg-slate-800/50 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{def.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold">{def.name}</h3>
                        <p className="mt-1 text-sm text-gray-400">{def.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-purple-400">+{def.xp} XP</span>
                          {unlocked && <Check className="h-4 w-4 text-green-400" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showAddHabit && <AddHabitModal onClose={() => setShowAddHabit(false)} onCreate={(payload) => addHabit(payload)} />}
      {editHabit && (
        <EditHabitModal
          habit={editHabit}
          onClose={() => setEditHabit(null)}
          onSave={(h) => saveHabitEdits(h)}
        />
      )}
    </div>
  )
}

function AddHabitModal({ onClose, onCreate }: { onClose: () => void; onCreate: (payload: Pick<Habit, 'name' | 'category' | 'difficulty' | 'xpValue'>) => void }) {
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState<keyof typeof categoryConfig>('Health')
  const [newHabitDifficulty, setNewHabitDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Epic'>('Medium')
  function handleSubmit() {
    if (!newHabitName.trim()) return
    const xpMap = { Easy: 1, Medium: 3, Hard: 5, Epic: 10 } as const
    onCreate({ name: newHabitName, category: newHabitCategory, difficulty: newHabitDifficulty, xpValue: xpMap[newHabitDifficulty] })
    setNewHabitName('')
    setNewHabitCategory('Health')
    setNewHabitDifficulty('Medium')
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold sm:mb-6 sm:text-2xl">Create New Quest</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Quest Name</label>
            <input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2" placeholder="e.g., Morning Meditation" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Category</label>
            <select value={newHabitCategory} onChange={(e) => setNewHabitCategory(e.target.value as keyof typeof categoryConfig)} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2">
              {Object.keys(categoryConfig).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Difficulty</label>
            <select value={newHabitDifficulty} onChange={(e) => setNewHabitDifficulty(e.target.value as any)} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2">
              <option value="Easy">Easy (1 XP)</option>
              <option value="Medium">Medium (3 XP)</option>
              <option value="Hard">Hard (5 XP)</option>
              <option value="Epic">Epic (10 XP)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg bg-slate-700 py-2 transition-colors hover:bg-slate-600">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 rounded-lg bg-purple-500 py-2 font-medium transition-colors hover:bg-purple-600">
            Create Quest
          </button>
        </div>
      </div>
    </div>
  )
}

export default HabitMasteryRPG

function EditHabitModal({ habit, onClose, onSave }: { habit: Habit; onClose: () => void; onSave: (h: Habit) => void }) {
  const [name, setName] = useState(habit.name)
  const [category, setCategory] = useState<Habit['category']>(habit.category)
  const [difficulty, setDifficulty] = useState<Habit['difficulty']>(habit.difficulty)
  const [xpValue, setXpValue] = useState<number>(habit.xpValue)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold sm:mb-6 sm:text-2xl">Edit Quest</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Quest Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as Habit['category'])} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2">
              {Object.keys(categoryConfig).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Habit['difficulty'])} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Epic">Epic</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">XP</label>
              <input type="number" min={1} value={xpValue} onChange={(e) => setXpValue(parseInt(e.target.value || '0', 10))} className="w-full rounded-lg bg-slate-700 px-4 py-2 outline-none ring-purple-500 focus:ring-2" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg bg-slate-700 py-2 transition-colors hover:bg-slate-600">
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...habit, name, category, difficulty, xpValue })}
            className="flex-1 rounded-lg bg-purple-500 py-2 font-medium transition-colors hover:bg-purple-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}


import HabitMasteryRPG from './components/HabitMasteryRPG'
import SignIn from './pages/SignIn'
import { useAuth } from './lib/AuthProvider'

function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-svh grid place-items-center text-white">Loading...</div>
  if (!user) return <SignIn />
  return <div className="min-h-svh bg-slate-900"><HabitMasteryRPG /></div>
}

export default App

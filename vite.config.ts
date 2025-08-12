import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  console.log('Vite config - command:', command)
  const base = command === 'build' ? '/habit-game/' : '/'
  console.log('Vite config - base path:', base)
  return {
    plugins: [react()],
    base: base,
  }
})

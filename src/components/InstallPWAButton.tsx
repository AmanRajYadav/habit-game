import React, { useEffect, useState } from 'react'

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function onInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome !== 'accepted') setCanInstall(false)
    setDeferredPrompt(null)
  }

  if (!canInstall) return null
  return (
    <button onClick={onInstall} className="rounded-lg bg-purple-500 px-3 py-2 text-sm hover:bg-purple-600">
      Install App
    </button>
  )
}

export default InstallPWAButton


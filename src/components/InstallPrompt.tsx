import { Download, Share, Smartphone, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface InstallPromptProps {
  surface?: 'card' | 'floating'
}

const DISMISS_KEY = 'marketos-install-prompt-dismissed'

export default function InstallPrompt({ surface = 'card' }: InstallPromptProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => readDismissedState())
  const [installed, setInstalled] = useState(() => isStandaloneMode())

  const device = useMemo(() => getDeviceInstallContext(), [])
  const canShow = !dismissed && !installed && (installEvent || device.isIos || device.isAndroid)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setInstalled(true)
      setDismissed(true)
      writeDismissedState()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (!canShow) return null

  const dismiss = () => {
    setDismissed(true)
    writeDismissedState()
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') dismiss()
    setInstallEvent(null)
  }

  return (
    <section className={`install-card install-card-${surface}`} aria-label="Install MarketOS on this phone">
      <div className="install-icon">
        <Smartphone size={18} />
      </div>
      <div className="install-copy">
        <strong>Add MarketOS to your phone</strong>
        <p>{installEvent ? 'Open it like a normal app from your home screen.' : device.instructions}</p>
      </div>
      {installEvent ? (
        <button className="install-action" type="button" onClick={() => void install()}>
          <Download size={16} />
          Install
        </button>
      ) : (
        <span className="install-hint">
          <Share size={15} />
          Add
        </span>
      )}
      <button className="install-dismiss" type="button" aria-label="Dismiss install prompt" onClick={dismiss}>
        <X size={15} />
      </button>
    </section>
  )
}

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function readDismissedState() {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissedState() {
  try {
    localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // Private browsing or locked-down browsers may block localStorage.
  }
}

function getDeviceInstallContext() {
  const userAgent = navigator.userAgent || ''
  const isIos = /iphone|ipad|ipod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /android/i.test(userAgent)

  if (isIos) {
    return {
      isAndroid,
      isIos,
      instructions: 'Tap Share, then Add to Home Screen.'
    }
  }

  return {
    isAndroid,
    isIos,
    instructions: 'Use your browser menu, then Add to Home screen.'
  }
}

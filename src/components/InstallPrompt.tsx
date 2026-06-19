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
  const [showHelp, setShowHelp] = useState(false)

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
        <button className="install-action install-help-button" type="button" onClick={() => setShowHelp(true)}>
          <Share size={15} />
          How
        </button>
      )}
      <button className="install-dismiss" type="button" aria-label="Dismiss install prompt" onClick={dismiss}>
        <X size={15} />
      </button>
      {showHelp && (
        <div className="install-help-sheet" role="dialog" aria-label="How to install MarketOS">
          <div className="install-help-card">
            <button className="install-dismiss" type="button" aria-label="Close install instructions" onClick={() => setShowHelp(false)}>
              <X size={15} />
            </button>
            <div className="install-icon">
              <Smartphone size={20} />
            </div>
            <h2>Add MarketOS to your home screen</h2>
            <ol>
              {device.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>Once added, open MarketOS from the phone icon just like a normal app.</p>
          </div>
        </div>
      )}
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
      instructions: 'Tap Share, then Add to Home Screen.',
      steps: ['Tap the Share button in Safari.', 'Choose Add to Home Screen.', 'Tap Add to save the MarketOS icon.']
    }
  }

  return {
    isAndroid,
    isIos,
    instructions: 'Use your browser menu, then Add to Home screen.',
    steps: ['Open the browser menu.', 'Choose Install app or Add to Home screen.', 'Confirm to save the MarketOS icon.']
  }
}

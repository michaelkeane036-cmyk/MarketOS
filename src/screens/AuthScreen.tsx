import { FormEvent, useState } from 'react'
import { ArrowRight, BadgeCheck, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import InstallPrompt from '../components/InstallPrompt'
import type { AuthMode } from '../types'

interface AuthScreenProps {
  authMode: AuthMode
  isBusy: boolean
  isPreviewAuth: boolean
  message: string
  onEmailAuth: (email: string, password: string, name?: string) => Promise<void>
  onModeChange: (mode: AuthMode) => void
  onPasswordReset: (email: string) => Promise<void>
}

export default function AuthScreen({
  authMode,
  isBusy,
  isPreviewAuth,
  message,
  onEmailAuth,
  onModeChange,
  onPasswordReset
}: AuthScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isCreate = authMode === 'create'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onEmailAuth(email, password, name)
  }

  return (
    <div className="app-shell auth-shell">
      <main className="auth-screen" aria-label="MarketOS authentication">
        <section className="auth-hero">
          <div className="brand-row">
            <div className="brand-mark">M</div>
            <span>MarketOS</span>
          </div>
          <h1>Run your business with records you can trust.</h1>
          <p>Sales, debts, stock, spending and profit clarity for Nigerian small businesses.</p>
          <div className="auth-safety-pill">
            <ShieldCheck size={17} />
            Records only. Money stays with your bank/POS/cash drawer.
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button className={!isCreate ? 'active' : ''} type="button" onClick={() => onModeChange('login')}>
              Log in
            </button>
            <button className={isCreate ? 'active' : ''} type="button" onClick={() => onModeChange('create')}>
              Create account
            </button>
          </div>
          <p className="auth-mode-note">
            {isCreate ? 'New users should create an account first. You may need to confirm your email before logging in.' : 'Already created an account? Log in with the email and password you used.'}
          </p>

          <form onSubmit={handleSubmit}>
            {isCreate && (
              <label className="field">
                <span>Owner name</span>
                <div>
                  <BadgeCheck size={18} />
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ayo" />
                </div>
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <div>
                <Mail size={18} />
                <input
                  autoComplete="email"
                  inputMode="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div>
                <LockKeyhole size={18} />
                <input
                  autoComplete={isCreate ? 'new-password' : 'current-password'}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                />
                <button className="icon-field-button" type="button" onClick={() => setShowPassword((shown) => !shown)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button className="primary-action auth-submit" disabled={isBusy} type="submit">
              {isBusy ? 'Please wait...' : isCreate ? 'Create account' : 'Log in'}
              <ArrowRight size={18} />
            </button>
          </form>

          <button className="reset-button" type="button" onClick={() => void onPasswordReset(email)}>
            Forgot password?
          </button>

          {(message || isPreviewAuth) && (
            <p className="auth-message">
              {message || 'Preview mode: auth uses a demo session until Supabase env vars are added.'}
            </p>
          )}
        </section>
        <InstallPrompt />
      </main>
    </div>
  )
}

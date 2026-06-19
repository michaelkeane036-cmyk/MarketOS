import { FormEvent, useState } from 'react'
import { ArrowRight, BadgeCheck, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import InstallPrompt from '../components/InstallPrompt'
import type { AuthMode } from '../types'

interface AuthScreenProps {
  authMode: AuthMode
  confirmationEmail: string
  isBusy: boolean
  isPreviewAuth: boolean
  message: string
  onBackToLogin: () => void
  onEditEmail: () => void
  onEmailAuth: (email: string, password: string, name?: string) => Promise<void>
  onModeChange: (mode: AuthMode) => void
  onPasswordReset: (email: string) => Promise<void>
  onResendConfirmation: (email: string) => Promise<void>
}

export default function AuthScreen({
  authMode,
  confirmationEmail,
  isBusy,
  isPreviewAuth,
  message,
  onBackToLogin,
  onEditEmail,
  onEmailAuth,
  onModeChange,
  onPasswordReset,
  onResendConfirmation
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
          {confirmationEmail ? (
            <div className="auth-confirmation-card">
              <BadgeCheck size={28} />
              <h2>Account created.</h2>
              <p>
                We sent a confirmation email to <strong>{confirmationEmail}</strong>. Confirm it, then return here and log in.
              </p>
              <button className="primary-action auth-submit" disabled={isBusy} type="button" onClick={onBackToLogin}>
                Back to log in
                <ArrowRight size={18} />
              </button>
              <button className="reset-button" disabled={isBusy} type="button" onClick={() => void onResendConfirmation(confirmationEmail)}>
                {isBusy ? 'Sending...' : 'Resend confirmation email'}
              </button>
              <button className="reset-button muted-reset" disabled={isBusy} type="button" onClick={onEditEmail}>
                Edit email
              </button>
            </div>
          ) : (
            <>
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

              <button className="reset-button" disabled={isBusy} type="button" onClick={() => void onPasswordReset(email)}>
                Forgot password?
              </button>
            </>
          )}

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

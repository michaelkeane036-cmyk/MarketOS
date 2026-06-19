import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react'
import type { AuthSession } from '../types'

interface EmailVerifiedScreenProps {
  session: AuthSession
  onContinue: () => void
}

export default function EmailVerifiedScreen({ session, onContinue }: EmailVerifiedScreenProps) {
  return (
    <div className="app-shell">
      <main className="setup-screen verified-screen" aria-label="Email verified">
        <section className="review-card verified-card">
          <div className="verified-icon">
            <BadgeCheck size={34} />
          </div>
          <span>Email verified</span>
          <h1>You are in, {session.user.name}.</h1>
          <p>Your MarketOS account is confirmed. Next, set up the business records workspace that will hold sales, debts, stock, and spending history.</p>
          <div className="setup-note">
            <ShieldCheck size={18} />
            <span>Records only. MarketOS still does not hold money, collect payments, or create a wallet.</span>
          </div>
          <button className="primary-action auth-submit" type="button" onClick={onContinue}>
            Set up business records
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
    </div>
  )
}

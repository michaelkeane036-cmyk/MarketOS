import { FormEvent, useState } from 'react'
import { ArrowRight, BadgeCheck, Building2, MapPin, ShieldCheck, Store } from 'lucide-react'
import type { AuthSession, BusinessProfile, BusinessSetupDraft } from '../types'

interface BusinessSetupScreenProps {
  business: BusinessProfile
  session: AuthSession
  onComplete: (setup: BusinessSetupDraft) => void
}

export default function BusinessSetupScreen({ business, session, onComplete }: BusinessSetupScreenProps) {
  const [setup, setSetup] = useState<BusinessSetupDraft>({
    name: business.name,
    businessType: business.businessType,
    ownerName: session.user.name || business.ownerName,
    location: business.location,
    currency: 'NGN'
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onComplete(setup)
  }

  return (
    <div className="app-shell">
      <main className="setup-screen" aria-label="Business setup">
        <section className="setup-hero">
          <div className="brand-row">
            <div className="brand-mark">M</div>
            <span>MarketOS</span>
          </div>
          <h1>Set up your business records.</h1>
          <p>Tell MarketOS what kind of shop you run. Money still stays with your bank, POS or cash drawer.</p>
        </section>

        <form className="setup-form review-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Business name</span>
            <div>
              <Store size={18} />
              <input
                value={setup.name}
                onChange={(event) => setSetup({ ...setup, name: event.target.value })}
                placeholder="Ayo Stores"
              />
            </div>
          </label>

          <label className="field">
            <span>Business type</span>
            <div>
              <Building2 size={18} />
              <input
                value={setup.businessType}
                onChange={(event) => setSetup({ ...setup, businessType: event.target.value })}
                placeholder="Provision store"
              />
            </div>
          </label>

          <label className="field">
            <span>Owner name</span>
            <div>
              <BadgeCheck size={18} />
              <input
                value={setup.ownerName}
                onChange={(event) => setSetup({ ...setup, ownerName: event.target.value })}
                placeholder="Ayo"
              />
            </div>
          </label>

          <label className="field">
            <span>Location</span>
            <div>
              <MapPin size={18} />
              <input
                value={setup.location}
                onChange={(event) => setSetup({ ...setup, location: event.target.value })}
                placeholder="Yaba, Lagos"
              />
            </div>
          </label>

          <div className="setup-note">
            <ShieldCheck size={18} />
            <span>Setup creates a records workspace only. It does not create a wallet or payment account.</span>
          </div>

          <button className="primary-action auth-submit" type="submit">
            Continue to dashboard
            <ArrowRight size={18} />
          </button>
        </form>
      </main>
    </div>
  )
}

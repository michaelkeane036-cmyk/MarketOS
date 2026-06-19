import { FormEvent, useState } from 'react'
import { ArrowRight, BadgeCheck, Building2, Globe2, MapPin, ShieldCheck, Store, WalletCards } from 'lucide-react'
import {
  buildLocationSummary,
  businessTypeSuggestions,
  countryOptions,
  currencyOptions,
  defaultCurrencyForCountry,
  regionOptionsByCountry
} from '../data/businessSetupOptions'
import type { AuthSession, BusinessProfile, BusinessSetupDraft, CountryCode } from '../types'

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
    address: business.address,
    country: business.country,
    stateRegion: business.stateRegion || regionOptionsByCountry[business.country][0] || '',
    currency: business.currency
  })
  const regionOptions = regionOptionsByCountry[setup.country]

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onComplete({
      ...setup,
      location: buildLocationSummary(setup.address, setup.stateRegion, setup.country)
    })
  }

  const handleCountryChange = (country: CountryCode) => {
    const nextRegions = regionOptionsByCountry[country]
    setSetup({
      ...setup,
      country,
      currency: defaultCurrencyForCountry(country),
      stateRegion: nextRegions[0] ?? ''
    })
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
                placeholder="Choose or type your business type"
              />
            </div>
          </label>
          <div className="suggestion-grid" aria-label="Business type suggestions">
            {businessTypeSuggestions.map((suggestion) => (
              <button
                className={setup.businessType === suggestion ? 'active' : ''}
                key={suggestion}
                type="button"
                onClick={() => setSetup({ ...setup, businessType: suggestion === 'Other' ? '' : suggestion })}
              >
                {suggestion}
              </button>
            ))}
          </div>

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
            <span>Address</span>
            <div>
              <MapPin size={18} />
              <input
                value={setup.address}
                onChange={(event) => setSetup({ ...setup, address: event.target.value })}
                placeholder="Shop 12, market road"
              />
            </div>
          </label>

          <div className="split-fields">
            <label className="field">
              <span>Country</span>
              <div>
                <Globe2 size={18} />
                <select value={setup.country} onChange={(event) => handleCountryChange(event.target.value as CountryCode)}>
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="field">
              <span>State / region</span>
              <div>
                <MapPin size={18} />
                {regionOptions.length ? (
                  <select value={setup.stateRegion} onChange={(event) => setSetup({ ...setup, stateRegion: event.target.value })}>
                    {regionOptions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={setup.stateRegion}
                    onChange={(event) => setSetup({ ...setup, stateRegion: event.target.value })}
                    placeholder="State or region"
                  />
                )}
              </div>
            </label>
          </div>

          <label className="field">
            <span>Currency</span>
            <div>
              <WalletCards size={18} />
              <select value={setup.currency} onChange={(event) => setSetup({ ...setup, currency: event.target.value as BusinessSetupDraft['currency'] })}>
                {currencyOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.label}
                  </option>
                ))}
              </select>
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

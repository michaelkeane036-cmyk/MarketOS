import { useState } from 'react'
import { ArrowLeft, Banknote, Check, CreditCard, PencilLine, ShieldCheck, UserPlus } from 'lucide-react'
import type { PaymentMethod, RecordKind, ReviewEntryDraft, ScanDraft } from '../types'

interface ReviewScreenProps {
  draft: ScanDraft
  onBack: () => void
  onSave: (entry: ReviewEntryDraft) => void
}

const recordTypes: Array<{ value: RecordKind; label: string }> = [
  { value: 'sale', label: 'Sale' },
  { value: 'expense', label: 'Expense' },
  { value: 'stock', label: 'Stock' },
  { value: 'debt', label: 'Debt' }
]

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'credit', label: 'Customer owes' }
]

export default function ReviewScreen({ draft, onBack, onSave }: ReviewScreenProps) {
  const [entry, setEntry] = useState<ReviewEntryDraft>(() => ({ ...draft.entry, evidence: draft.image }))

  return (
    <div className="app-shell">
      <main className="review-screen">
        <header className="screen-header">
          <button className="round-icon-button" type="button" onClick={onBack} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <span>Review Draft</span>
            <h1>Confirm before saving.</h1>
          </div>
        </header>

        <img className="review-image" src={draft.image.dataUrl} alt="Captured business record" />

        <section className="review-card">
          <div className="quick-title">
            <PencilLine size={22} />
            <strong>Evidence attached draft</strong>
          </div>

          <label className="field">
            <span>Record type</span>
            <div>
              <PencilLine size={18} />
              <select
                value={entry.type}
                onChange={(event) => setEntry({ ...entry, type: event.target.value as RecordKind })}
              >
                {recordTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>Summary</span>
            <textarea value={entry.summary} onChange={(event) => setEntry({ ...entry, summary: event.target.value })} />
          </label>

          <label className="field">
            <span>Customer</span>
            <div>
              <UserPlus size={18} />
              <input
                value={entry.customerName}
                onChange={(event) => setEntry({ ...entry, customerName: event.target.value })}
              />
            </div>
          </label>

          <div className="split-fields">
            <label className="field">
              <span>Item</span>
              <div>
                <PencilLine size={18} />
                <input value={entry.itemName} onChange={(event) => setEntry({ ...entry, itemName: event.target.value })} />
              </div>
            </label>
            <label className="field">
              <span>Qty</span>
              <div>
                <PencilLine size={18} />
                <input
                  inputMode="decimal"
                  value={entry.quantity}
                  onChange={(event) => setEntry({ ...entry, quantity: event.target.value })}
                />
              </div>
            </label>
          </div>

          <label className="field">
            <span>Amount</span>
            <div>
              <Banknote size={18} />
              <input
                inputMode="decimal"
                value={entry.amount}
                onChange={(event) => setEntry({ ...entry, amount: event.target.value })}
              />
            </div>
          </label>

          <label className="field">
            <span>Payment method</span>
            <div>
              <CreditCard size={18} />
              <select
                value={entry.paymentMethod}
                onChange={(event) => setEntry({ ...entry, paymentMethod: event.target.value as PaymentMethod })}
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>Note</span>
            <textarea value={entry.note} onChange={(event) => setEntry({ ...entry, note: event.target.value })} />
          </label>
        </section>

        <p className="scan-safety">
          <ShieldCheck size={17} />
          Review is mandatory because OCR/AI is not connected yet.
        </p>

        <button className="primary-action save-review-button" type="button" onClick={() => onSave(entry)}>
          <Check size={20} />
          Save as evidence-attached record
        </button>
      </main>
    </div>
  )
}

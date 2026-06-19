import { ChangeEvent, FormEvent, useState } from 'react'
import {
  ArrowLeft,
  Banknote,
  Camera,
  Check,
  CreditCard,
  ImagePlus,
  PackagePlus,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  WalletCards
} from 'lucide-react'
import type { CapturedImage, Customer, PaymentMethod, Product, RecordKind, ReviewEntryDraft } from '../types'
import { createDraftForKind } from '../utils/records'
import { issueMessages, validateReviewEntry } from '../utils/validation'

interface RecordEntryScreenProps {
  type: RecordKind
  customers?: Customer[]
  initialDraft?: ReviewEntryDraft
  products?: Product[]
  onBack: () => void
  onScan: () => void
  onSave: (draft: ReviewEntryDraft) => void
}

const recordMeta = {
  sale: {
    label: 'Review Sale',
    title: 'Confirm sale before saving.',
    icon: ShoppingCart
  },
  expense: {
    label: 'Review Expense',
    title: 'Confirm expense before saving.',
    icon: WalletCards
  },
  stock: {
    label: 'Review Stock',
    title: 'Confirm stock change.',
    icon: PackagePlus
  },
  debt: {
    label: 'Review Debt',
    title: 'Confirm customer balance.',
    icon: UserPlus
  }
}

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'credit', label: 'Customer owes' }
]

export default function RecordEntryScreen({
  type,
  customers = [],
  initialDraft,
  products = [],
  onBack,
  onScan,
  onSave
}: RecordEntryScreenProps) {
  const [entry, setEntry] = useState<ReviewEntryDraft>(() => initialDraft ?? createDraftForKind(type))
  const [errors, setErrors] = useState<string[]>([])
  const meta = recordMeta[type]
  const Icon = meta.icon

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateReviewEntry(entry)
    if (!validation.valid) {
      setErrors(issueMessages(validation))
      return
    }
    setErrors([])
    onSave(entry)
  }

  const handleCustomerChange = (value: string) => {
    const customer = customers.find((item) => item.id === value || item.name.toLowerCase() === value.toLowerCase())
    if (customer) {
      setEntry((current) => ({ ...current, customerId: customer.id, customerName: customer.name }))
      return
    }
    setEntry((current) => ({ ...current, customerId: undefined, customerName: value }))
  }

  const handleProductChange = (value: string) => {
    const product = products.find((item) => item.id === value || item.name.toLowerCase() === value.toLowerCase())
    if (product) {
      const quantity = Number(entry.quantity || 1) || 1
      setEntry((current) => ({
        ...current,
        productId: product.id,
        itemName: product.name,
        stockUnit: product.unit,
        unitCost: String(product.unitCost),
        unitPrice: String(product.sellingPrice),
        amount: current.quantity ? String(quantity * product.sellingPrice) : current.amount
      }))
      return
    }
    setEntry((current) => ({ ...current, productId: undefined, itemName: value }))
  }

  const handleEvidenceUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const evidence: CapturedImage = {
          source: 'upload',
          dataUrl: result,
          capturedAt: new Date().toISOString()
        }
        setEntry((current) => ({ ...current, evidence }))
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="app-shell">
      <main className="record-screen" aria-label={`${meta.label} form`}>
        <header className="screen-header">
          <button className="round-icon-button" type="button" onClick={onBack} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <span>{meta.label}</span>
            <h1>{meta.title}</h1>
          </div>
        </header>

        <form className="review-card record-form" onSubmit={handleSubmit}>
          <div className="quick-title">
            <Icon size={22} />
            <strong>{entry.correctsRecordId ? 'Correction review' : entry.evidence ? 'Evidence attached' : 'Owner-reviewed record'}</strong>
          </div>

          {entry.correctsRecordId && (
            <p className="correction-note">
              This will keep the original in history, void it as corrected, and save this replacement.
            </p>
          )}

          {errors.length > 0 && (
            <div className="form-errors" role="alert">
              {errors.map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          )}

          <label className="field">
            <span>Summary</span>
            <textarea value={entry.summary} onChange={(event) => setEntry({ ...entry, summary: event.target.value })} />
          </label>

          {(type === 'sale' || type === 'debt') && (
            <label className="field">
              <span>Customer</span>
              <div>
                <UserPlus size={18} />
                <input value={entry.customerName} onChange={(event) => handleCustomerChange(event.target.value)} placeholder="Walk-in customer" list="customer-options" />
              </div>
              <datalist id="customer-options">
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name} />
                ))}
              </datalist>
            </label>
          )}

          {(type === 'sale' || type === 'stock') && (
            <div className="split-fields">
              <label className="field">
                <span>Item</span>
                <div>
                  <ShoppingCart size={18} />
                  <input
                    value={entry.itemName}
                    onChange={(event) => handleProductChange(event.target.value)}
                    placeholder="Rice"
                    list="product-options"
                  />
                </div>
                <datalist id="product-options">
                  {products.map((product) => (
                    <option key={product.id} value={product.name} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Qty</span>
                <div>
                  <PackagePlus size={18} />
                  <input
                    inputMode="decimal"
                    value={entry.quantity}
                    onChange={(event) => setEntry({ ...entry, quantity: event.target.value })}
                  />
                </div>
              </label>
            </div>
          )}

          {type === 'sale' && (
            <div className="split-fields">
              <label className="field">
                <span>Unit price</span>
                <div>
                  <Banknote size={18} />
                  <input
                    inputMode="decimal"
                    value={entry.unitPrice}
                    onChange={(event) => setEntry({ ...entry, unitPrice: event.target.value })}
                  />
                </div>
              </label>
              <label className="field">
                <span>Unit cost</span>
                <div>
                  <Banknote size={18} />
                  <input
                    inputMode="decimal"
                    value={entry.unitCost}
                    onChange={(event) => setEntry({ ...entry, unitCost: event.target.value })}
                  />
                </div>
              </label>
            </div>
          )}

          {type === 'stock' && (
            <div className="split-fields">
              <label className="field">
                <span>Unit</span>
                <div>
                  <PackagePlus size={18} />
                  <input
                    value={entry.stockUnit}
                    onChange={(event) => setEntry({ ...entry, stockUnit: event.target.value })}
                    placeholder="bags"
                  />
                </div>
              </label>
              <label className="field">
                <span>Unit cost</span>
                <div>
                  <Banknote size={18} />
                  <input
                    inputMode="decimal"
                    value={entry.unitCost}
                    onChange={(event) => setEntry({ ...entry, unitCost: event.target.value })}
                  />
                </div>
              </label>
            </div>
          )}

          {type === 'expense' && (
            <label className="field">
              <span>Expense label</span>
              <div>
                <WalletCards size={18} />
                <input
                  value={entry.itemName}
                  onChange={(event) => setEntry({ ...entry, itemName: event.target.value })}
                  placeholder="Transport, rent, withdrawal..."
                />
              </div>
            </label>
          )}

          <div className="split-fields">
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
            {(type === 'sale' || type === 'debt') && (
              <label className="field">
                <span>Paid now</span>
                <div>
                  <Banknote size={18} />
                  <input
                    inputMode="decimal"
                    value={entry.paidAmount}
                    onChange={(event) => setEntry({ ...entry, paidAmount: event.target.value })}
                  />
                </div>
              </label>
            )}
          </div>

          {(type === 'sale' || type === 'expense') && (
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
          )}

          <label className="field">
            <span>Note</span>
            <textarea value={entry.note} onChange={(event) => setEntry({ ...entry, note: event.target.value })} />
          </label>

          <div className="evidence-actions">
            <label className="upload-button">
              <ImagePlus size={20} />
              Attach evidence
              <input accept="image/*" type="file" onChange={handleEvidenceUpload} />
            </label>
            <button className="upload-button" type="button" onClick={onScan}>
              <Camera size={20} />
              Scan instead
            </button>
          </div>

          <p className="scan-safety">
            <ShieldCheck size={17} />
            Saving records business activity only. It does not confirm money unless evidence or a future integration does.
          </p>

          <button className="primary-action save-review-button" type="submit">
            <Check size={20} />
            Save reviewed record
          </button>
        </form>
      </main>
    </div>
  )
}

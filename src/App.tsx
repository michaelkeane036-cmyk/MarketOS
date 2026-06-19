import { useEffect, useMemo, useState } from 'react'
import AuthScreen from './screens/AuthScreen'
import BusinessSetupScreen from './screens/BusinessSetupScreen'
import DashboardScreen from './screens/DashboardScreen'
import RecordEntryScreen from './screens/RecordEntryScreen'
import ReviewScreen from './screens/ReviewScreen'
import ScanScreen from './screens/ScanScreen'
import WorkspaceScreen, { type WorkspaceView } from './screens/WorkspaceScreen'
import type { MainTab } from './components/AppBottomNav'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import {
  applyLocalCustomer,
  applyLocalProduct,
  applyLocalRecord,
  applyLocalVoid,
  createBusinessWorkspace,
  createScanDraftInSupabase,
  loadMarketWorkspace,
  saveCustomerToSupabase,
  saveProductToSupabase,
  saveReviewedRecordToSupabase,
  voidRecordInSupabase
} from './lib/marketosRepository'
import { business, defaultReviewDraft, emptyRecords, initialRecords } from './data/mockData'
import { buildDashboardModel, cloneRecords, createDraftForKind } from './utils/records'
import type {
  AuthMode,
  AuthSession,
  BusinessSetupDraft,
  CapturedImage,
  CustomerDraft,
  ProductDraft,
  RecordKind,
  ReviewEntryDraft,
  ScanDraft
} from './types'

type AppView = MainTab | WorkspaceView | 'scan' | 'review' | 'record'

const demoSession: AuthSession = {
  provider: 'demo',
  user: {
    id: 'demo-user',
    name: business.ownerName,
    email: 'ayo@marketos.demo'
  }
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [session, setSession] = useState<AuthSession | null>(null)
  const [view, setView] = useState<AppView>('today')
  const [businessProfile, setBusinessProfile] = useState(business)
  const [records, setRecords] = useState(() => cloneRecords(initialRecords))
  const [recordType, setRecordType] = useState<RecordKind>('sale')
  const [recordInitialDraft, setRecordInitialDraft] = useState<ReviewEntryDraft | null>(null)
  const [scanDraft, setScanDraft] = useState<ScanDraft | null>(null)
  const [authMessage, setAuthMessage] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const [isSavingRecord, setIsSavingRecord] = useState(false)

  const isPreviewAuth = useMemo(() => !hasSupabaseConfig, [])
  const dashboard = useMemo(() => buildDashboardModel(records), [records])

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (!user) return

      setSession({
        provider: 'supabase',
        user: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'MarketOS User',
          email: user.email || ''
        }
      })
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const user = nextSession?.user
      if (!user) {
        setSession(null)
        return
      }

      setSession({
        provider: 'supabase',
        user: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'MarketOS User',
          email: user.email || ''
        }
      })
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || session.provider !== 'supabase' || !supabase) return

    let mounted = true

    const loadWorkspace = async () => {
      setIsWorkspaceLoading(true)
      setAuthMessage('')

      try {
        const workspace = await loadMarketWorkspace(session.user.id)
        if (!mounted) return

        if (workspace.business) {
          setBusinessProfile({
            ...workspace.business,
            ownerName: session.user.name || workspace.business.ownerName
          })
          setRecords(workspace.records)
        } else {
          setBusinessProfile({
            ...business,
            ownerName: session.user.name || business.ownerName,
            setupComplete: false
          })
          setRecords(cloneRecords(emptyRecords))
        }
      } catch (error) {
        if (!mounted) return
        setAuthMessage(`Could not load Supabase workspace: ${messageFromError(error)}`)
      } finally {
        if (mounted) setIsWorkspaceLoading(false)
      }
    }

    void loadWorkspace()

    return () => {
      mounted = false
    }
  }, [session])

  const startDemoSession = (message: string) => {
    setSession(demoSession)
    setView('today')
    setAuthMessage(message)
  }

  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setConfirmationEmail('')
    setAuthMessage('')
  }

  const handleEmailAuth = async (email: string, password: string, name?: string) => {
    if (isAuthBusy) return

    setIsAuthBusy(true)
    setAuthMessage('')
    setConfirmationEmail('')

    try {
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        setAuthMessage('Enter your email and password to continue.')
        return
      }

      if (!supabase) {
        startDemoSession('Demo mode: Supabase env vars are not connected yet.')
        return
      }

      const response =
        authMode === 'create'
          ? await supabase.auth.signUp({
              email: trimmedEmail,
              password,
              options: { data: { full_name: name?.trim() || trimmedEmail.split('@')[0] || business.ownerName } }
            })
          : await supabase.auth.signInWithPassword({ email: trimmedEmail, password })

      if (response.error) {
        setAuthMessage(friendlyAuthMessage(response.error.message, authMode))
        return
      }

      const user = response.data.session?.user
      if (user) {
        setSession({
          provider: 'supabase',
          user: {
            id: user.id,
            name: user.user_metadata?.full_name || name?.trim() || user.email?.split('@')[0] || 'MarketOS User',
            email: user.email || trimmedEmail
          }
        })
        setView('today')
        return
      }

      if (authMode === 'create') {
        setConfirmationEmail(trimmedEmail)
        setAuthMessage('Account created. Check your email to confirm it, then come back and log in.')
      } else {
        setAuthMessage('Login did not return a session. Confirm your email first, then try again.')
      }
    } catch (error) {
      setAuthMessage(friendlyAuthMessage(messageFromError(error), authMode))
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handleBackToLogin = () => {
    setAuthMode('login')
    setConfirmationEmail('')
    setAuthMessage('Email confirmed already? Log in with the same details.')
  }

  const handleEditAuthEmail = () => {
    setConfirmationEmail('')
    setAuthMessage('')
  }

  const handleResendConfirmation = async (email: string) => {
    if (isAuthBusy) return

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setAuthMessage('Enter your email first, then resend confirmation.')
      return
    }

    setIsAuthBusy(true)
    setAuthMessage('')

    try {
      if (!supabase) {
        setAuthMessage('Demo mode: email confirmation works when Supabase is connected.')
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail
      })

      setAuthMessage(error ? friendlyAuthMessage(error.message, 'create') : 'Confirmation email sent again. Check your inbox or spam folder.')
    } catch (error) {
      setAuthMessage(friendlyAuthMessage(messageFromError(error), 'create'))
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handlePasswordReset = async (email: string) => {
    if (isAuthBusy) return

    if (!email) {
      setAuthMessage('Enter your email first, then request the reset link.')
      return
    }

    if (!supabase) {
      setAuthMessage('Demo mode: password reset will work when Supabase is configured.')
      return
    }

    setIsAuthBusy(true)
    setAuthMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      setAuthMessage(error ? friendlyAuthMessage(error.message, 'login') : 'Password reset email sent. Check your inbox or spam folder.')
    } catch (error) {
      setAuthMessage(friendlyAuthMessage(messageFromError(error), 'login'))
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setView('today')
    setScanDraft(null)
  }

  const handleSetupComplete = async (setup: BusinessSetupDraft) => {
    if (session?.provider === 'supabase' && supabase) {
      setIsWorkspaceLoading(true)
      setAuthMessage('')

      try {
        const workspace = await createBusinessWorkspace(setup, session.user.id)
        if (workspace.business) {
          setBusinessProfile({
            ...workspace.business,
            ownerName: setup.ownerName || session.user.name
          })
        }
        setRecords(workspace.records)
        setView('today')
      } catch (error) {
        setAuthMessage(`Could not create business workspace: ${messageFromError(error)}`)
      } finally {
        setIsWorkspaceLoading(false)
      }
      return
    }

    setBusinessProfile((current) => ({
      ...current,
      name: setup.name || current.name,
      businessType: setup.businessType || current.businessType,
      ownerName: setup.ownerName || current.ownerName,
      location: setup.location || current.location,
      currency: setup.currency,
      setupComplete: true
    }))
    setView('today')
  }

  const handleStartRecord = (type: RecordKind) => {
    setRecordType(type)
    setRecordInitialDraft(null)
    setView('record')
  }

  const reloadWorkspace = async () => {
    if (session?.provider !== 'supabase' || !supabase) return
    const workspace = await loadMarketWorkspace(session.user.id)
    if (workspace.business) setBusinessProfile({ ...workspace.business, ownerName: businessProfile.ownerName })
    setRecords(workspace.records)
  }

  const handleSaveRecord = async (entry: ReviewEntryDraft, source: 'manual' | 'scan') => {
    setIsSavingRecord(true)
    setAuthMessage('')

    if (session?.provider === 'supabase' && supabase && businessProfile.setupComplete) {
      try {
        await saveReviewedRecordToSupabase({
          business: businessProfile,
          userId: session.user.id,
          entry,
          source
        })
        await reloadWorkspace()
      } catch (error) {
        setAuthMessage(`Saved locally only. Supabase save failed: ${messageFromError(error)}`)
        setRecords((current) => applyLocalRecord(current, entry, source))
      } finally {
        setIsSavingRecord(false)
      }
    } else {
      setRecords((current) => applyLocalRecord(current, entry, source))
      setIsSavingRecord(false)
    }

    setScanDraft(null)
    setRecordInitialDraft(null)
    setView('today')
  }

  const handleCapture = async (image: CapturedImage) => {
    if (session?.provider === 'supabase' && supabase && businessProfile.setupComplete) {
      try {
        const persistedDraft = await createScanDraftInSupabase({ business: businessProfile, image })
        setScanDraft(persistedDraft)
        await reloadWorkspace()
      } catch (error) {
        setAuthMessage(`Scan draft stayed local. Supabase draft failed: ${messageFromError(error)}`)
        setScanDraft({ image, entry: { ...defaultReviewDraft, evidence: image } })
      }
    } else {
      setScanDraft({ image, entry: { ...defaultReviewDraft, evidence: image } })
    }

    setView('review')
  }

  const handleReviewPersistedDraft = (draftId: string) => {
    const draft = records.scanDrafts.find((item) => item.id === draftId)
    if (!draft) return

    const image: CapturedImage = {
      source: draft.source,
      dataUrl: draft.imageUrl || '',
      capturedAt: draft.createdAt,
      storagePath: draft.imagePath
    }

    setScanDraft({
      id: draft.id,
      image,
      imagePath: draft.imagePath,
      status: draft.status,
      createdAt: draft.createdAt,
      reviewedAt: draft.reviewedAt,
      entry: {
        ...createDraftForReview(draft.entryType),
        summary: draft.extractedSummary || 'Review scan before saving.',
        evidence: image,
        scanDraftId: draft.id
      }
    })
    setView('review')
  }

  const handleSaveProduct = async (draft: ProductDraft) => {
    if (session?.provider === 'supabase' && supabase && businessProfile.setupComplete) {
      try {
        await saveProductToSupabase(businessProfile.id, draft)
        await reloadWorkspace()
        return
      } catch (error) {
        setAuthMessage(`Product saved locally only. Supabase failed: ${messageFromError(error)}`)
      }
    }
    setRecords((current) => applyLocalProduct(current, draft))
  }

  const handleSaveCustomer = async (draft: CustomerDraft) => {
    if (session?.provider === 'supabase' && supabase && businessProfile.setupComplete) {
      try {
        await saveCustomerToSupabase(businessProfile.id, draft)
        await reloadWorkspace()
        return
      } catch (error) {
        setAuthMessage(`Customer saved locally only. Supabase failed: ${messageFromError(error)}`)
      }
    }
    setRecords((current) => applyLocalCustomer(current, draft))
  }

  const handleVoidRecord = async (recordTypeToVoid: RecordKind, recordId: string, reason: string) => {
    if (session?.provider === 'supabase' && supabase && businessProfile.setupComplete) {
      try {
        await voidRecordInSupabase(businessProfile.id, recordTypeToVoid, recordId, reason)
        await reloadWorkspace()
        return
      } catch (error) {
        setAuthMessage(`Record voided locally only. Supabase failed: ${messageFromError(error)}`)
      }
    }
    setRecords((current) => applyLocalVoid(current, recordTypeToVoid, recordId, reason))
  }

  const handleCorrectRecord = (type: RecordKind, draft: ReviewEntryDraft) => {
    setRecordType(type)
    setRecordInitialDraft(draft)
    setView('record')
  }

  const handleStartCustomerRecord = (type: Extract<RecordKind, 'sale' | 'debt'>, customerName: string, customerId?: string) => {
    setRecordType(type)
    setRecordInitialDraft({
      ...createDraftForKind(type),
      customerId,
      customerName
    })
    setView('record')
  }

  if (!session) {
    return (
      <AuthScreen
        authMode={authMode}
        confirmationEmail={confirmationEmail}
        isBusy={isAuthBusy}
        isPreviewAuth={isPreviewAuth}
        message={authMessage}
        onBackToLogin={handleBackToLogin}
        onEditEmail={handleEditAuthEmail}
        onEmailAuth={handleEmailAuth}
        onModeChange={handleAuthModeChange}
        onPasswordReset={handlePasswordReset}
        onResendConfirmation={handleResendConfirmation}
      />
    )
  }

  if (isWorkspaceLoading) {
    return (
      <div className="app-shell">
        <main className="setup-screen">
          <section className="review-card loading-card">
            <div className="brand-row">
              <div className="brand-mark">M</div>
              <span>MarketOS</span>
            </div>
            <h1>Loading your records.</h1>
            <p>Keeping the app records-only while we fetch your business workspace.</p>
          </section>
        </main>
      </div>
    )
  }

  if (!businessProfile.setupComplete) {
    return <BusinessSetupScreen business={businessProfile} session={session} onComplete={handleSetupComplete} />
  }

  if (view === 'record') {
    return (
      <RecordEntryScreen
        type={recordType}
        customers={records.customers}
        initialDraft={recordInitialDraft ?? undefined}
        products={records.products}
        onBack={() => setView('today')}
        onScan={() => setView('scan')}
        onSave={(entry) => {
          if (!isSavingRecord) void handleSaveRecord(entry, 'manual')
        }}
      />
    )
  }

  if (view === 'scan') {
    return <ScanScreen onBack={() => setView('today')} onCapture={handleCapture} />
  }

  if (view === 'review' && scanDraft) {
    return (
      <ReviewScreen
        draft={scanDraft}
        onBack={() => setView('scan')}
        onSave={(entry) => {
          if (!isSavingRecord) void handleSaveRecord(entry, 'scan')
        }}
      />
    )
  }

  if (view === 'review') {
    return <ScanScreen onBack={() => setView('today')} onCapture={handleCapture} />
  }

  if (view !== 'today') {
    return (
      <WorkspaceScreen
        authMessage={authMessage}
        business={businessProfile}
        debtRecords={dashboard.debtRecords}
        draftCount={dashboard.draftCount}
        estimatedProfit={dashboard.estimatedProfit}
        expenses={records.expenses}
        ownerWithdrawalTotal={dashboard.ownerWithdrawalTotal}
        products={records.products}
        recentRecords={dashboard.recentRecords}
        records={records}
        sales={records.sales}
        scanDrafts={records.scanDrafts}
        session={session}
        stockAlerts={dashboard.stockAlerts}
        stockMovements={records.stockMovements}
        view={view}
        customers={records.customers}
        onCorrectRecord={handleCorrectRecord}
        onLogout={handleLogout}
        onNavigate={setView}
        onReviewDraft={handleReviewPersistedDraft}
        onScan={() => setView('scan')}
        onSaveCustomer={(draft) => void handleSaveCustomer(draft)}
        onSaveProduct={(draft) => void handleSaveProduct(draft)}
        onStartCustomerRecord={handleStartCustomerRecord}
        onStartRecord={handleStartRecord}
        onVoidRecord={(type, id, reason) => void handleVoidRecord(type, id, reason)}
      />
    )
  }

  return (
    <DashboardScreen
      business={businessProfile}
      metrics={dashboard.metrics}
      debtRecords={dashboard.debtRecords}
      stockAlerts={dashboard.stockAlerts}
      ownerWithdrawalTotal={dashboard.ownerWithdrawalTotal}
      estimatedProfit={dashboard.estimatedProfit}
      draftCount={dashboard.draftCount}
      onAccount={() => setView('account')}
      onNavigate={setView}
      onNotifications={() => setView('notifications')}
      onStartRecord={handleStartRecord}
      onScan={() => setView('scan')}
    />
  )
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function friendlyAuthMessage(message: string, mode: AuthMode) {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('headers') && lowerMessage.includes('iso-8859-1')) {
    return 'Supabase key problem: the saved API key has a hidden invalid character. Re-save VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.'
  }

  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('fetch failed') || lowerMessage.includes('network')) {
    return 'Network problem. Check your internet connection and try again.'
  }

  if (lowerMessage.includes('invalid email') || lowerMessage.includes('email address is invalid')) {
    return 'Enter a valid email address, then try again.'
  }

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('security purposes') || lowerMessage.includes('too many')) {
    return 'Too many attempts for now. Wait a little, then try again.'
  }

  if (lowerMessage.includes('invalid login credentials')) {
    return 'Could not log in with those details. Create an account first, confirm your email, or reset your password.'
  }

  if (lowerMessage.includes('email not confirmed')) {
    return 'This email is not confirmed yet. Check your inbox, confirm it, then log in again.'
  }

  if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return 'This email already has an account. Switch to Log in or reset the password.'
  }

  if (lowerMessage.includes('password')) {
    return mode === 'create' ? 'Use a stronger password with at least 6 characters.' : message
  }

  return message
}

function createDraftForReview(type: RecordKind): ReviewEntryDraft {
  return {
    ...createDraftForKind(type),
    summary: 'Review scan before saving.',
    evidence: undefined,
    scanDraftId: undefined
  }
}

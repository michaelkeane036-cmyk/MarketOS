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

  const handleEmailAuth = async (email: string, password: string, name?: string) => {
    setIsAuthBusy(true)
    setAuthMessage('')

    try {
      if (!supabase) {
        startDemoSession('Demo mode: Supabase env vars are not connected yet.')
        return
      }

      const response =
        authMode === 'create'
          ? await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: name || business.ownerName } }
            })
          : await supabase.auth.signInWithPassword({ email, password })

      if (response.error) {
        setAuthMessage(response.error.message)
        return
      }

      const user = response.data.user
      if (user) {
        setSession({
          provider: 'supabase',
          user: {
            id: user.id,
            name: user.user_metadata?.full_name || name || user.email?.split('@')[0] || 'MarketOS User',
            email: user.email || email
          }
        })
        setView('today')
      } else {
        setAuthMessage('Check your email to confirm this account.')
      }
    } finally {
      setIsAuthBusy(false)
    }
  }

  const handlePasswordReset = async (email: string) => {
    if (!email) {
      setAuthMessage('Enter your email first, then request the reset link.')
      return
    }

    if (!supabase) {
      setAuthMessage('Demo mode: password reset will work when Supabase is configured.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setAuthMessage(error ? error.message : 'Password reset email sent.')
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
        isBusy={isAuthBusy}
        isPreviewAuth={isPreviewAuth}
        message={authMessage}
        onEmailAuth={handleEmailAuth}
        onModeChange={setAuthMode}
        onPasswordReset={handlePasswordReset}
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

function createDraftForReview(type: RecordKind): ReviewEntryDraft {
  return {
    ...createDraftForKind(type),
    summary: 'Review scan before saving.',
    evidence: undefined,
    scanDraftId: undefined
  }
}

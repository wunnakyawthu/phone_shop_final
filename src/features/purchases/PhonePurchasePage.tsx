import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PhonePurchaseForm } from './components/PhonePurchaseForm'
import {
  createPhonePurchase,
  loadPhonePurchaseMasterData,
  upsertPhoneModelWithSpecs,
} from './purchaseApi'
import type {
  NewPhoneModelInput,
  PhonePurchaseDraft,
  PhonePurchaseMasterData,
  ProductModelOption,
} from './purchaseTypes'
import type { PhonePurchasePhotoMap } from './photoTypes'
import { BackLink } from '../../components/navigation/BackLink'

export function PhonePurchasePage() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [masterData, setMasterData] = useState<PhonePurchaseMasterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const notificationRef = useRef<HTMLDivElement | null>(null)
  const currentUserId = session?.user.id ?? ''

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      try {
        setPageError(null)
        const data = await loadPhonePurchaseMasterData()
        if (!cancelled) setMasterData(data)
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error ? error.message : 'Failed to load purchase data.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadPage()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreateModel(
    input: NewPhoneModelInput,
  ): Promise<ProductModelOption> {
    const modelId = await upsertPhoneModelWithSpecs(input)
    const refreshed = await loadPhonePurchaseMasterData()
    setMasterData(refreshed)
    const created = refreshed.models.find((model) => model.id === modelId)
    if (!created)
      throw new Error('Model was saved but could not be loaded. Please refresh.')
    return created
  }

  function scrollToNotification() {
    window.requestAnimationFrame(() => {
      notificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleSubmit(
    draft: PhonePurchaseDraft,
    photosByItem: PhonePurchasePhotoMap,
  ) {
    if (!masterData) throw new Error('Purchase data is not ready.')

    setSubmitError(null)
    setSuccessMessage(null)

    try {
      const purchase = await createPhonePurchase(
        draft,
        masterData,
        photosByItem,
        currentUserId,
      )
      setSuccessMessage(`${purchase.purchaseNumber} has been received into inventory.`)
      window.setTimeout(() => navigate('/app/phones', { replace: true }), 1400)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save purchase.')
      scrollToNotification()
      throw error
    }
  }

  if (isLoading) {
    return (
      <section>
        <div className="h-8 w-44 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (pageError) {
    return (
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Phone Purchase
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm"
        >
          {pageError}
        </div>
      </section>
    )
  }

  if (!masterData || !currentUserId) return null

  return (
    <section className="pb-6 sm:pb-8">
      <div className="management-page-hero">
        <div>
          <BackLink to="/app/phones">Back to phones</BackLink>
          <p className="management-eyebrow mt-5">Phone workspace</p>
          <h1 className="management-title">Phone Purchase</h1>
          <p className="management-subtitle">
            Receive new or used phones into inventory with seller details, pricing and
            product photos.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Draft autosave on
        </div>
      </div>

      <div ref={notificationRef} className="scroll-mt-24">
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-3xl border border-red-200 bg-red-50/90 p-4 shadow-sm shadow-red-100/40 sm:p-5"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-100 font-bold text-red-700">
                !
              </span>
              <div>
                <p className="font-bold text-red-800">Purchase could not be saved</p>
                <p className="mt-1 text-sm leading-6 text-red-700">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm shadow-emerald-100/40 sm:p-5"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-100 font-bold text-emerald-700">
                ✓
              </span>
              <div>
                <p className="font-bold text-emerald-800">Purchase saved successfully</p>
                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {successMessage && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-950">
              Purchase saved successfully
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Returning to Phone Inventory…
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <PhonePurchaseForm
          masterData={masterData}
          currentUserId={currentUserId}
          currentUserRole={profile?.role ?? 'phone_staff'}
          onSubmit={handleSubmit}
          onCreateModel={handleCreateModel}
        />
      </div>
    </section>
  )
}

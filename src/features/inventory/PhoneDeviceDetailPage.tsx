import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/navigation/BackLink'

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { SoldVoucherPanel } from '../pos/SoldVoucherPanel'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'
import { deletePhoneInventoryItem, loadPhoneInventoryItem } from './phoneInventoryApi'
import type { PhoneInventoryItem } from './phoneInventoryTypes'

function formatMmk(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('en-US').format(value)} MMK`
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value))
}

function SpecCard({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 sm:p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
        {label}
      </p>
      <p
        className={[
          'mt-1.5 break-words text-sm font-bold text-slate-900 sm:text-[15px]',
          mono ? 'font-mono' : '',
        ].join(' ')}
      >
        {value ?? '—'}
      </p>
    </div>
  )
}

export function PhoneDeviceDetailPage() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [item, setItem] = useState<PhoneInventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [purchasedByName, setPurchasedByName] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!deviceId) {
      setError('Device ID is missing.')
      setIsLoading(false)
      return undefined
    }

    void loadPhoneInventoryItem(deviceId)
      .then((data) => {
        if (!active) return

        if (!data) {
          setError('Phone not found.')
          return
        }

        setItem(data)
        setActivePhoto(0)
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Failed to load phone.')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [deviceId])

  useEffect(() => {
    if (!deviceId || !supabase) return

    const client = supabase
    const currentDeviceId = deviceId
    let active = true

    async function loadPurchaser() {
      try {
        const { data: purchaseItem, error: purchaseItemError } = await client
          .from('purchase_items')
          .select('purchase_id')
          .eq('device_unit_id', currentDeviceId)
          .maybeSingle()

        if (purchaseItemError) throw purchaseItemError
        if (!purchaseItem?.purchase_id) return

        const { data: purchase, error: purchaseError } = await client
          .from('purchases')
          .select('purchased_by_user_id')
          .eq('id', purchaseItem.purchase_id)
          .single()

        if (purchaseError) throw purchaseError

        const { data: purchaser, error: purchaserError } = await client
          .from('profiles')
          .select('full_name')
          .eq('id', purchase.purchased_by_user_id)
          .maybeSingle()

        if (purchaserError) throw purchaserError

        if (active) {
          setPurchasedByName(purchaser?.full_name ?? 'Unknown staff')
        }
      } catch (caught) {
        console.error('Failed to load purchaser:', caught)
      }
    }

    void loadPurchaser()

    return () => {
      active = false
    }
  }, [deviceId])

  useEffect(() => {
    if (viewerIndex === null || !item) return

    const photoCount = item.photoUrls.length

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setViewerIndex(null)
        return
      }

      if (photoCount <= 1) return

      if (event.key === 'ArrowLeft') {
        setViewerIndex((current) => {
          if (current === null) return null
          return (current - 1 + photoCount) % photoCount
        })
      }

      if (event.key === 'ArrowRight') {
        setViewerIndex((current) => {
          if (current === null) return null
          return (current + 1) % photoCount
        })
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [viewerIndex, item])

  async function handleDelete() {
    if (!item || isDeleting) return

    setIsDeleting(true)
    setError(null)

    try {
      await deletePhoneInventoryItem(item.id)
      navigate('/app/phones/deleted', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to delete phone.')
      setDeleteOpen(false)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="h-8 w-44 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-[32rem] animate-pulse rounded-[2rem] bg-white shadow-sm" />
      </div>
    )
  }

  if (!item) {
    return (
      <section className="mx-auto max-w-6xl">
        <BackLink to="/app/phones">Phone Inventory</BackLink>

        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">
          {error ?? 'Phone not found.'}
        </div>
      </section>
    )
  }

  const sourceName = item.sellerName || 'Walk-in / not provided'
  const selectedPhoto = item.photoUrls[activePhoto] ?? null

  return (
    <section className="mx-auto max-w-6xl pb-8">
      <BackLink to="/app/phones">Phone Inventory</BackLink>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-[2.2rem] border border-white/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,.1)]">
        <div className="grid lg:grid-cols-[1.12fr_.88fr]">
          <div className="border-b border-slate-100 p-3 sm:p-5 lg:border-b-0 lg:border-r">
            {selectedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={() => setViewerIndex(activePhoto)}
                  className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[1.7rem] bg-[linear-gradient(145deg,#f8fafc,#eef2ff)] text-left shadow-inner"
                  aria-label="Open phone photo full screen"
                >
                  <img
                    src={selectedPhoto}
                    alt={`${item.modelName} photo ${activePhoto + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                  />

                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                    View full photo
                  </span>

                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                    {activePhoto + 1} / {item.photoUrls.length}
                  </span>
                </button>

                {item.photoUrls.length > 1 && (
                  <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {item.photoUrls.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setActivePhoto(index)}
                        className={[
                          'aspect-square overflow-hidden rounded-xl bg-slate-100 ring-2 ring-offset-2 transition',
                          activePhoto === index
                            ? 'ring-brand-500'
                            : 'ring-transparent hover:ring-slate-300',
                        ].join(' ')}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl shadow-sm">
                    📱
                  </div>
                  <p className="mt-4 font-bold text-slate-800">No product photos</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add photos later from Edit.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold capitalize text-white">
                {item.status.replaceAll('_', ' ')}
              </span>

              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold capitalize text-brand-700">
                {item.deviceState}
              </span>
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              {item.brandName}
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.03em] text-slate-950 sm:text-4xl">
              {item.modelName}
            </h1>

            <p className="mt-2 font-mono text-sm font-semibold text-slate-500">
              IMEI {item.imei1}
            </p>

            <div className="mt-7 rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Selling price
              </p>

              <p className="mt-2 text-3xl font-bold tracking-[-0.02em]">
                {formatMmk(item.salePriceMmk)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">Purchase cost</span>
                <span className="text-sm font-bold text-white">
                  {formatMmk(item.purchasePriceMmk)}
                </span>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <Link
                to={`/app/phones/${item.id}/edit`}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-700"
              >
                Edit Phone
              </Link>

              {(profile?.role === 'owner' || profile?.role === 'manager') && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
            <div>
              <p className="text-sm font-semibold text-brand-600">Specifications</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Device information
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SpecCard label="IMEI 1" value={item.imei1} mono />
              <SpecCard label="IMEI 2" value={item.imei2} mono />
              {item.iphoneRegionCode && (
                <SpecCard label="Region" value={item.iphoneRegionCode} />
              )}
              <SpecCard label="Color" value={item.color} />
              <SpecCard
                label="Storage"
                value={item.storageCapacityGb ? `${item.storageCapacityGb} GB` : '—'}
              />
              {item.phonePlatform !== 'iphone' && (
                <SpecCard label="RAM" value={item.ramGb ? `${item.ramGb} GB` : '—'} />
              )}
              {item.phonePlatform === 'iphone' &&
                item.modelName.toLowerCase().startsWith('iphone') &&
                item.deviceState === 'used' && (
                  <>
                    <SpecCard
                      label="Battery health"
                      value={
                        item.batteryHealthPercent !== null
                          ? `${item.batteryHealthPercent}%`
                          : '—'
                      }
                    />
                  </>
                )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
            <p className="text-sm font-semibold text-brand-600">Staff notes</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Internal notes</h2>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {item.internalNotes || 'No internal notes.'}
              </p>
            </div>
          </section>
        </div>

        <section className="h-fit rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
          <p className="text-sm font-semibold text-brand-600">Transaction</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Purchase record</h2>

          <div className="mt-5 space-y-3">
            <SpecCard label="Purchase no." value={item.purchaseNumber} mono />
            <SpecCard label="Purchase date" value={formatDate(item.purchaseDate)} />
            <SpecCard label="Purchased By" value={purchasedByName ?? '—'} />
            <SpecCard label="Seller / Supplier" value={sourceName} />
            {item.sellerPhone && <SpecCard label="Phone" value={item.sellerPhone} />}
          </div>
        </section>
      </div>

      <SoldVoucherPanel category="phone" inventoryId={item.id} />

      {viewerIndex !== null && item.photoUrls[viewerIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen phone photo"
          onClick={() => setViewerIndex(null)}
        >
          <button
            type="button"
            onClick={() => setViewerIndex(null)}
            className="absolute right-3 top-3 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-3xl font-light text-white backdrop-blur transition hover:bg-white/25 sm:right-5 sm:top-5"
            aria-label="Close photo"
          >
            ×
          </button>

          {item.photoUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setViewerIndex(
                  (viewerIndex - 1 + item.photoUrls.length) % item.photoUrls.length,
                )
              }}
              className="absolute left-2 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-4xl font-light text-white backdrop-blur sm:left-5"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={item.photoUrls[viewerIndex]}
            alt={`${item.modelName} full photo ${viewerIndex + 1}`}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92svh] max-w-[96vw] object-contain sm:max-h-[90vh] sm:max-w-[90vw]"
          />

          {item.photoUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setViewerIndex((viewerIndex + 1) % item.photoUrls.length)
              }}
              className="absolute right-2 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-4xl font-light text-white backdrop-blur sm:right-5"
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
            {viewerIndex + 1} / {item.photoUrls.length}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Move this phone to Delete History?"
        description="The phone will disappear from active inventory and the public website, but it can still be reviewed in Delete History. Only an owner or manager can do this."
        confirmLabel={isDeleting ? 'Moving...' : 'Move to Delete History'}
        onCancel={() => !isDeleting && setDeleteOpen(false)}
        onConfirm={() => {
          void handleDelete()
        }}
      />
    </section>
  )
}

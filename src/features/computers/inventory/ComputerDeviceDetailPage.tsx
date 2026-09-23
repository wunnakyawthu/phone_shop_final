import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../../components/navigation/BackLink'

import { ConfirmDialog } from '../../../components/feedback/ConfirmDialog'
import { SoldVoucherPanel } from '../../pos/SoldVoucherPanel'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../../auth/AuthProvider'
import { getComputerPhotoUrl } from '../purchases/computerPhotoUpload'

type ComputerItem = {
  id: string
  brand: string | null
  computer_type: string
  model_name: string
  cpu: string | null
  ram: string | null
  primary_storage_type: string | null
  primary_storage_size: string | null
  secondary_storage_type: string | null
  secondary_storage_size: string | null
  gpu: string | null
  screen_size: string | null
  color: string | null
  serial_number: string | null
  condition: string | null
  purchase_from: string | null
  seller_phone: string | null
  purchase_notes: string | null
  purchase_date: string | null
  purchase_price: number | null
  sale_price: number | null
  status: string | null
  purchased_by_user_id: string | null
  purchase_number: string | null
  internal_notes: string | null
  is_publicly_visible: boolean
}

type ComputerPhoto = {
  id: string
  storage_path: string
  sort_order: number
}

function formatMoney(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('en-US').format(value)} MMK`
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

function formatComputerType(value: string) {
  const labels: Record<string, string> = {
    macbook: 'MacBook',
    windows_laptop: 'Windows Laptop',
    all_in_one: 'All-in-One',
    desktop_system_unit: 'Desktop System Unit',
  }

  return labels[value] ?? value.replaceAll('_', ' ')
}

function formatCondition(value: string | null) {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatStatus(value: string | null) {
  if (!value) return '—'
  return value.replaceAll('_', ' ')
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

export default function ComputerDeviceDetailPage() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [computer, setComputer] = useState<ComputerItem | null>(null)
  const [photos, setPhotos] = useState<ComputerPhoto[]>([])
  const [purchasedByName, setPurchasedByName] = useState<string | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = profile?.role === 'owner' || profile?.role === 'manager'

  useEffect(() => {
    if (!deviceId || !supabase) {
      if (!deviceId) setErrorMessage('Computer ID is missing.')
      if (!supabase) {
        setErrorMessage('Supabase client is not configured.')
      }
      setLoading(false)
      return
    }

    const client = supabase
    const currentDeviceId = deviceId
    let active = true

    async function loadComputer() {
      try {
        setErrorMessage('')

        const [computerResult, photoResult] = await Promise.all([
          client
            .from('computer_inventory_items')
            .select('*')
            .eq('id', currentDeviceId)
            .eq('is_deleted', false)
            .single(),

          client
            .from('computer_inventory_photos')
            .select('id, storage_path, sort_order')
            .eq('computer_id', currentDeviceId)
            .order('sort_order', { ascending: true }),
        ])

        if (computerResult.error) throw computerResult.error
        if (photoResult.error) throw photoResult.error
        if (!active) return

        const loadedComputer = computerResult.data as unknown as ComputerItem

        setComputer(loadedComputer)
        setPhotos((photoResult.data ?? []) as ComputerPhoto[])
        setActivePhoto(0)

        if (loadedComputer.purchased_by_user_id) {
          const { data: purchaser, error: purchaserError } = await client
            .from('profiles')
            .select('full_name')
            .eq('id', loadedComputer.purchased_by_user_id)
            .maybeSingle()

          if (!purchaserError && active) {
            setPurchasedByName(purchaser?.full_name ?? null)
          }
        }
      } catch (error) {
        console.error(error)

        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load this computer.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadComputer()

    return () => {
      active = false
    }
  }, [deviceId])

  const photoUrls = useMemo(
    () =>
      photos.map((photo) => ({
        ...photo,
        url: getComputerPhotoUrl(photo.storage_path),
      })),
    [photos],
  )

  useEffect(() => {
    if (viewerIndex === null) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setViewerIndex(null)
        return
      }

      if (photoUrls.length <= 1) return

      if (event.key === 'ArrowLeft') {
        setViewerIndex((current) => {
          if (current === null) return null
          return (current - 1 + photoUrls.length) % photoUrls.length
        })
      }

      if (event.key === 'ArrowRight') {
        setViewerIndex((current) => {
          if (current === null) return null
          return (current + 1) % photoUrls.length
        })
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [viewerIndex, photoUrls.length])

  async function handleDelete() {
    if (!computer || !supabase || isDeleting) return

    try {
      setIsDeleting(true)
      setErrorMessage('')

      const { error } = await supabase.rpc('delete_computer_inventory_item', {
        p_computer_id: computer.id,
      })

      if (error) throw error

      navigate('/app/computers', {
        replace: true,
      })
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete computer.',
      )

      setDeleteOpen(false)
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="h-8 w-44 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-[32rem] animate-pulse rounded-[2rem] bg-white shadow-sm" />
      </div>
    )
  }

  if (!computer) {
    return (
      <section className="mx-auto max-w-6xl">
        <BackLink to="/app/computers">Computer Inventory</BackLink>

        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">
          {errorMessage || 'Computer not found.'}
        </div>
      </section>
    )
  }

  const primaryStorage = [computer.primary_storage_size, computer.primary_storage_type]
    .filter(Boolean)
    .join(' ')

  const secondaryStorage = [
    computer.secondary_storage_size,
    computer.secondary_storage_type,
  ]
    .filter(Boolean)
    .join(' ')

  const selectedPhoto = photoUrls[activePhoto]?.url ?? null

  return (
    <section className="mx-auto max-w-6xl pb-8">
      <BackLink to="/app/computers">Computer Inventory</BackLink>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
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
                  aria-label="Open computer photo full screen"
                >
                  <img
                    src={selectedPhoto}
                    alt={`${computer.model_name} photo ${activePhoto + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                  />

                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                    View full photo
                  </span>

                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                    {activePhoto + 1} / {photoUrls.length}
                  </span>
                </button>

                {photoUrls.length > 1 && (
                  <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {photoUrls.map((photo, index) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setActivePhoto(index)}
                        className={[
                          'aspect-square overflow-hidden rounded-xl bg-slate-100 ring-2 ring-offset-2 transition',
                          activePhoto === index
                            ? 'ring-brand-500'
                            : 'ring-transparent hover:ring-slate-300',
                        ].join(' ')}
                      >
                        <img
                          src={photo.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl shadow-sm">
                    🖥️
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
                {formatStatus(computer.status)}
              </span>

              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
                {formatCondition(computer.condition)}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                {formatComputerType(computer.computer_type)}
              </span>
              {computer.is_publicly_visible && (
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  On website
                </span>
              )}
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              {computer.brand || 'Computer'}
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.03em] text-slate-950 sm:text-4xl">
              {computer.model_name}
            </h1>

            <p className="mt-2 font-mono text-sm font-semibold text-slate-500">
              Serial {computer.serial_number || 'Not provided'}
            </p>

            <div className="mt-7 rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Selling price
              </p>

              <p className="mt-2 text-3xl font-bold tracking-[-0.02em]">
                {formatMoney(computer.sale_price)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">Purchase cost</span>
                <span className="text-sm font-bold text-white">
                  {formatMoney(computer.purchase_price)}
                </span>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <Link
                to={`/app/computers/${computer.id}/edit`}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-700"
              >
                Edit Computer
              </Link>

              {canDelete && (
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
            <p className="text-sm font-semibold text-brand-600">Specifications</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Device information</h2>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SpecCard
                label="Computer Type"
                value={formatComputerType(computer.computer_type)}
              />
              <SpecCard label="CPU" value={computer.cpu} />
              <SpecCard label="RAM" value={computer.ram} />
              <SpecCard label="Primary Storage" value={primaryStorage || '—'} />
              <SpecCard label="Secondary Storage" value={secondaryStorage || 'None'} />
              <SpecCard label="GPU" value={computer.gpu} />
              <SpecCard label="Screen Size" value={computer.screen_size} />
              <SpecCard label="Color" value={computer.color} />
              <SpecCard label="Serial Number" value={computer.serial_number} mono />
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
            <p className="text-sm font-semibold text-brand-600">Staff notes</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Internal notes</h2>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {computer.internal_notes || 'No internal notes.'}
              </p>
            </div>
          </section>
        </div>

        <section className="h-fit rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
          <p className="text-sm font-semibold text-brand-600">Transaction</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Purchase record</h2>

          <div className="mt-5 space-y-3">
            <SpecCard
              label="Purchase no."
              value={computer.purchase_number || 'Not recorded'}
              mono
            />
            <SpecCard label="Purchase date" value={formatDate(computer.purchase_date)} />
            <SpecCard label="Purchased By" value={purchasedByName || 'Not recorded'} />
            <SpecCard
              label="Seller / Supplier"
              value={computer.purchase_from || 'Walk-in / not provided'}
            />
            {computer.seller_phone && (
              <SpecCard label="Phone" value={computer.seller_phone} />
            )}
          </div>
        </section>
      </div>

      <SoldVoucherPanel category="computer" inventoryId={computer.id} />

      {viewerIndex !== null && photoUrls[viewerIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen computer photo"
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

          {photoUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setViewerIndex((viewerIndex - 1 + photoUrls.length) % photoUrls.length)
              }}
              className="absolute left-2 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-4xl font-light text-white backdrop-blur sm:left-5"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={photoUrls[viewerIndex].url}
            alt={`${computer.model_name} full photo ${viewerIndex + 1}`}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92svh] max-w-[96vw] object-contain sm:max-h-[90vh] sm:max-w-[90vw]"
          />

          {photoUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setViewerIndex((viewerIndex + 1) % photoUrls.length)
              }}
              className="absolute right-2 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-4xl font-light text-white backdrop-blur sm:right-5"
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
            {viewerIndex + 1} / {photoUrls.length}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Move this computer to Delete History?"
        description="The computer will disappear from active inventory, but it can be restored later from Delete History. Only an owner or manager can do this."
        confirmLabel={isDeleting ? 'Moving...' : 'Move to Delete History'}
        onCancel={() => !isDeleting && setDeleteOpen(false)}
        onConfirm={() => {
          void handleDelete()
        }}
      />
    </section>
  )
}

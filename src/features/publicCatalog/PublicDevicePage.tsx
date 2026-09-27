import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { loadPublicDevice, type PublicCatalogDevice } from './publicCatalogApi'

import { PublicCatalogLayout } from './PublicCatalogLayout'
import { useStoreBranding } from '../settings/storeBranding'
import { BackLink } from '../../components/navigation/BackLink'
import { TelegramIcon } from '../../components/icons/SocialIcons'

function money(value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} MMK`
}

function formatCondition(value: string | null) {
  if (!value) {
    return '-'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function PublicDevicePage() {
  const { publicId } = useParams()
  const { branding } = useStoreBranding()

  const [item, setItem] = useState<PublicCatalogDevice | null>(null)

  const [activePhoto, setActivePhoto] = useState(0)

  const [isPhotoOpen, setIsPhotoOpen] = useState(false)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!publicId) {
      setError('Product not found.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    void loadPublicDevice(publicId)
      .then((data) => {
        if (!active) {
          return
        }

        if (data) {
          setItem(data)
          setActivePhoto(0)
        } else {
          setError('This product is no longer available.')
        }
      })
      .catch((caught) => {
        if (!active) {
          return
        }

        setError(caught instanceof Error ? caught.message : 'Could not load product.')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [publicId])

  useEffect(() => {
    if (!isPhotoOpen) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPhotoOpen(false)
      }

      if (!item || item.photoUrls.length < 2) {
        return
      }

      if (event.key === 'ArrowLeft') {
        setActivePhoto(
          (current) => (current - 1 + item.photoUrls.length) % item.photoUrls.length,
        )
      }

      if (event.key === 'ArrowRight') {
        setActivePhoto((current) => (current + 1) % item.photoUrls.length)
      }
    }

    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''

      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isPhotoOpen, item])

  function previousPhoto() {
    if (!item?.photoUrls.length) {
      return
    }

    setActivePhoto(
      (current) => (current - 1 + item.photoUrls.length) % item.photoUrls.length,
    )
  }

  function nextPhoto() {
    if (!item?.photoUrls.length) {
      return
    }

    setActivePhoto((current) => (current + 1) % item.photoUrls.length)
  }

  return (
    <PublicCatalogLayout>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        {loading ? (
          <div className="h-[32rem] animate-pulse rounded-[2rem] bg-white" />
        ) : error || !item ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-xl font-bold text-slate-950">
              {error ?? 'Product not found.'}
            </p>

            <div className="mt-5 flex justify-center">
              <BackLink to="/">Back to products</BackLink>
            </div>
          </div>
        ) : (
          <>
            <BackLink to={item.category === 'phone' ? '/phones' : '/computers'}>
              Back to {item.category === 'phone' ? 'phones' : 'computers'}
            </BackLink>

            <div className="mt-5 grid gap-7 lg:grid-cols-[1.08fr_.92fr] lg:gap-10">
              {/* Photos */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (item.photoUrls[activePhoto]) {
                      setIsPhotoOpen(true)
                    }
                  }}
                  className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[1.9rem] bg-[linear-gradient(145deg,#ffffff,#f4f7ff)] text-left shadow-[0_22px_60px_rgba(15,23,42,.12)] ring-1 ring-white sm:rounded-[2.2rem]"
                  aria-label="Open product photo full screen"
                >
                  {item.photoUrls[activePhoto] ? (
                    <img
                      src={item.photoUrls[activePhoto]}
                      alt={item.publicTitle}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.01]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-slate-100">
                      <span className="text-sm font-bold text-slate-400">No photo</span>
                    </div>
                  )}

                  {item.photoUrls[activePhoto] && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur sm:bottom-4 sm:right-4">
                      Tap to view full photo
                    </span>
                  )}
                </button>

                {item.photoUrls.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
                    {item.photoUrls.map((url, index) => (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => setActivePhoto(index)}
                        aria-label={`View product photo ${index + 1}`}
                        className={`aspect-square overflow-hidden rounded-2xl bg-white ring-2 transition ${
                          activePhoto === index
                            ? 'ring-brand-500'
                            : 'ring-transparent hover:ring-slate-300'
                        }`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product information */}
              <div className="lg:pt-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    Available
                  </span>

                  <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">
                    {item.category === 'computer'
                      ? formatCondition(item.conditionText)
                      : item.deviceState}
                  </span>
                </div>

                <p className="mt-5 text-sm font-bold uppercase tracking-[0.13em] text-brand-600 sm:mt-6">
                  {item.brandName}
                </p>

                <h1 className="mt-2 text-[2.35rem] font-bold leading-[1.06] tracking-[-0.025em] text-slate-950 sm:text-5xl">
                  {item.modelName}
                </h1>

                <div className="mt-6 overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_85%_10%,rgba(59,130,246,.32),transparent_35%),linear-gradient(145deg,#07111f,#111c34)] p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,.2)] sm:p-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">
                    Selling price
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
                    {money(item.salePriceMmk)}
                  </p>
                  <div className="mt-5 h-px bg-white/10" />
                  <p className="mt-4 text-sm font-semibold text-slate-300">
                    Available in store now
                  </p>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  {item.category === 'computer' ? (
                    <>
                      {item.conditionText && (
                        <Spec
                          label="Condition"
                          value={formatCondition(item.conditionText)}
                        />
                      )}

                      {item.ramText && <Spec label="RAM" value={item.ramText} />}

                      {item.primaryStorageText && (
                        <Spec label="Primary Storage" value={item.primaryStorageText} />
                      )}

                      {item.secondaryStorageText && (
                        <Spec
                          label="Secondary Storage"
                          value={item.secondaryStorageText}
                        />
                      )}

                      {item.cpuProcessor && (
                        <Spec label="Processor" value={item.cpuProcessor} />
                      )}

                      {item.gpuGraphics && (
                        <Spec label="Graphics" value={item.gpuGraphics} />
                      )}

                      {item.screenSizeText && (
                        <Spec label="Screen" value={item.screenSizeText} />
                      )}

                      {item.color && <Spec label="Color" value={item.color} />}
                    </>
                  ) : (
                    <>
                      {item.storageCapacityGb !== null && (
                        <Spec label="Storage" value={`${item.storageCapacityGb} GB`} />
                      )}

                      {item.ramGb !== null && (
                        <Spec label="RAM" value={`${item.ramGb} GB`} />
                      )}

                      {item.color && <Spec label="Color" value={item.color} />}

                      {item.iphoneRegionCode && (
                        <Spec label="Region" value={item.iphoneRegionCode} />
                      )}

                      {item.batteryHealthPercent !== null && (
                        <Spec
                          label="Battery health"
                          value={`${item.batteryHealthPercent}%`}
                        />
                      )}

                      {item.cpuProcessor && (
                        <Spec label="Processor" value={item.cpuProcessor} />
                      )}

                      {item.gpuGraphics && (
                        <Spec label="Graphics" value={item.gpuGraphics} />
                      )}

                      {item.screenSizeInches !== null && (
                        <Spec label="Screen" value={`${item.screenSizeInches}"`} />
                      )}
                    </>
                  )}
                </div>

                {item.internalNotes && (
                  <div className="mt-7 rounded-[1.8rem] border border-amber-100 bg-amber-50/80 p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-amber-700">
                      Device notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                      {item.internalNotes}
                    </p>
                  </div>
                )}

                <div className="mt-7 rounded-[1.8rem] border border-blue-100 bg-[linear-gradient(145deg,#eff6ff,#f5f3ff)] p-5 text-slate-900 shadow-sm">
                  <p className="text-sm font-black">Interested in this device?</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                    Contact {branding.storeName} or visit the shop to confirm availability
                    before coming.
                  </p>
                  {(branding.phone || branding.facebookUrl) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {branding.phone && (
                        <a
                          href={`tel:${branding.phone}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
                        >
                          Call {branding.phone}
                        </a>
                      )}
                      {branding.facebookUrl && (
                        <a
                          href={branding.facebookUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-50"
                        >
                          Facebook
                        </a>
                      )}
                      {branding.telegramUrl && (
                                        <a
                                          href={branding.telegramUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2.5 text-sm font-semibold text-white"
                                        >
                                          <TelegramIcon className="h-5 w-5" />
                                          Telegram
                                        </a>
                                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Full-screen photo viewer */}
            {isPhotoOpen && item.photoUrls[activePhoto] && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-label="Full screen product photo"
                onClick={() => setIsPhotoOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsPhotoOpen(false)}
                  className="absolute right-3 top-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl font-medium text-white backdrop-blur transition hover:bg-white/25 sm:right-5 sm:top-5"
                  aria-label="Close photo"
                >
                  ×
                </button>

                {item.photoUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        previousPhoto()
                      }}
                      className="absolute left-2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl font-medium text-white backdrop-blur transition hover:bg-white/25 sm:left-5"
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        nextPhoto()
                      }}
                      className="absolute right-2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl font-medium text-white backdrop-blur transition hover:bg-white/25 sm:right-5"
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  </>
                )}

                <img
                  src={item.photoUrls[activePhoto]}
                  alt={item.publicTitle}
                  onClick={(event) => event.stopPropagation()}
                  className="max-h-[94dvh] max-w-[96vw] select-none object-contain"
                />

                {item.photoUrls.length > 1 && (
                  <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
                    {activePhoto + 1} / {item.photoUrls.length}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </PublicCatalogLayout>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/90 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

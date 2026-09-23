import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { loadPhonePurchaseMasterData } from '../purchases/purchaseApi'
import type { PhonePurchaseMasterData } from '../purchases/purchaseTypes'
import {
  cleanupUploadedPhotos,
  getDevicePhotoUrl,
  uploadAdditionalDevicePhotos,
  validateOriginalPhoto,
} from '../purchases/devicePhotoUpload'
import { loadPhoneInventoryItem, updatePhoneInventoryItem } from './phoneInventoryApi'
import type { PhoneInventoryItem } from './phoneInventoryTypes'
import { createClientId } from '../../lib/id'
import { BackLink } from '../../components/navigation/BackLink'

const MAX_PHOTOS = 6

const fieldClass =
  'min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-semibold text-slate-950 shadow-sm transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-400'
const labelClass = 'text-sm font-bold text-slate-700 sm:text-[15px]'
const sectionClass = 'premium-form-card'

function digitsOnly(value: string) {
  return value.replace(/\D/g, '').slice(0, 15)
}

function moneyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return ''
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? ''
}

export function PhoneDeviceEditPage() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()

  const [item, setItem] = useState<PhoneInventoryItem | null>(null)
  const [masterData, setMasterData] = useState<PhonePurchaseMasterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [deviceState, setDeviceState] = useState<'new' | 'used'>('used')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')
  const [purchaseNotes, setPurchaseNotes] = useState('')
  const [purchasedByName, setPurchasedByName] = useState('Not recorded')

  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [color, setColor] = useState('')
  const [storage, setStorage] = useState('')
  const [ram, setRam] = useState('')
  const [imei1, setImei1] = useState('')
  const [imei2, setImei2] = useState('')
  const [region, setRegion] = useState('')
  const [batteryHealth, setBatteryHealth] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [notes, setNotes] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const [keptPhotoPaths, setKeptPhotoPaths] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<
    Array<{ id: string; file: File; previewUrl: string }>
  >([])
  const [photoOrder, setPhotoOrder] = useState<string[]>([])

  useEffect(() => {
    if (!deviceId) return

    let active = true

    Promise.all([loadPhoneInventoryItem(deviceId), loadPhonePurchaseMasterData()])
      .then(([loadedItem, loadedMaster]) => {
        if (!active) return
        if (!loadedItem) throw new Error('Phone not found.')

        setItem(loadedItem)
        setMasterData(loadedMaster)

        setDeviceState(loadedItem.deviceState)
        setPurchaseDate(
          dateInputValue(loadedItem.purchaseDate) || dateInputValue(loadedItem.createdAt),
        )
        setSellerName(loadedItem.sellerName ?? '')
        setSellerPhone(loadedItem.sellerPhone ?? '')
        setPurchaseNotes(loadedItem.purchaseNotes ?? '')
        setPurchasedByName(loadedItem.purchasedByName ?? 'Not recorded')

        setBrandId(loadedItem.brandId)
        setModelId(loadedItem.modelId)
        setColor(loadedItem.color ?? '')
        setStorage(loadedItem.storageCapacityGb?.toString() ?? '')
        setRam(loadedItem.ramGb?.toString() ?? '')
        setImei1(loadedItem.imei1 ?? '')
        setImei2(loadedItem.imei2 ?? '')
        setRegion(loadedItem.iphoneRegionCode ?? '')
        setBatteryHealth(loadedItem.batteryHealthPercent?.toString() ?? '')
        setPurchasePrice(loadedItem.purchasePriceMmk?.toString() ?? '')
        setSalePrice(loadedItem.salePriceMmk.toString())
        setNotes(loadedItem.internalNotes ?? '')
        setIsPublic(loadedItem.isPubliclyVisible)
        setKeptPhotoPaths(loadedItem.photoPaths)
        setPhotoOrder(loadedItem.photoPaths.map((path) => `p:${path}`))
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Failed to load phone.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [deviceId])

  const selectedModel = useMemo(
    () => masterData?.models.find((model) => model.id === modelId) ?? null,
    [masterData, modelId],
  )

  const modelsForBrand = useMemo(
    () => masterData?.models.filter((model) => model.brandId === brandId) ?? [],
    [masterData, brandId],
  )

  const isAppleDevice = Boolean(
    selectedModel &&
    (selectedModel.phonePlatform === 'iphone' ||
      selectedModel.name.toLowerCase().startsWith('ipad')),
  )
  const isIPhone = selectedModel?.phonePlatform === 'iphone'
  const isUsedIPhone = isIPhone && deviceState === 'used'
  const imeiCount = selectedModel?.imeiCount ?? 2
  const totalPhotos = photoOrder.length
  const sourceLabel = deviceState === 'used' ? 'Seller' : 'Supplier'

  function chooseBrand(nextBrandId: string) {
    setBrandId(nextBrandId)
    setModelId('')
    setColor('')
    setStorage('')
    setRam('')
  }

  function chooseModel(nextModelId: string) {
    setModelId(nextModelId)
    const model = masterData?.models.find((candidate) => candidate.id === nextModelId)

    setColor('')
    setStorage('')

    if (model?.phonePlatform === 'iphone') {
      setRam('')
    } else {
      setRegion('')
      setBatteryHealth('')
    }
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    const messages = files.map(validateOriginalPhoto).filter(Boolean) as string[]
    if (messages.length) {
      setError(messages.join(' '))
      return
    }

    const room = MAX_PHOTOS - totalPhotos
    if (room <= 0) {
      setError('Maximum 6 photos allowed.')
      return
    }

    if (files.length > room) {
      setError(`You can only add ${room} more photo${room === 1 ? '' : 's'}.`)
      return
    }

    const added = files.map((file) => ({
      id: createClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setNewPhotos((current) => [...current, ...added])
    setPhotoOrder((current) => [...current, ...added.map((photo) => `n:${photo.id}`)])
  }

  function removePhoto(token: string) {
    setPhotoOrder((current) => current.filter((value) => value !== token))

    if (token.startsWith('p:')) {
      const path = token.slice(2)
      setKeptPhotoPaths((current) => current.filter((value) => value !== path))
      return
    }

    const id = token.slice(2)
    setNewPhotos((current) => {
      const target = current.find((value) => value.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((value) => value.id !== id)
    })
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= photoOrder.length) return

    setPhotoOrder((current) => {
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!deviceId || !item || !selectedModel || !session?.user.id || isSaving) {
      return
    }

    setError(null)
    setSuccessMessage(null)

    if (!purchaseDate) {
      setError('Purchase Date is required.')
      return
    }

    if (!/^\d{15}$/.test(imei1)) {
      setError('IMEI 1 must be exactly 15 digits.')
      return
    }

    if (imei2 && !/^\d{15}$/.test(imei2)) {
      setError('IMEI 2 must be exactly 15 digits when entered.')
      return
    }

    if (imei1 === imei2 && imei2) {
      setError('IMEI 1 and IMEI 2 cannot be the same.')
      return
    }

    if (totalPhotos > MAX_PHOTOS) {
      setError('A phone can have at most 6 photos.')
      return
    }

    const battery = batteryHealth === '' ? null : Number(batteryHealth)
    if (battery !== null && (battery < 0 || battery > 100)) {
      setError('Battery Health must be between 0 and 100%.')
      return
    }

    const sale = Number(salePrice)
    const purchase = purchasePrice === '' ? null : Number(purchasePrice)

    if (!Number.isFinite(sale) || sale < 0) {
      setError('Sale price is invalid.')
      return
    }

    if (purchase !== null && (!Number.isFinite(purchase) || purchase < 0)) {
      setError('Purchase price is invalid.')
      return
    }

    setIsSaving(true)
    let uploadedPaths: string[] = []

    try {
      const orderedNew = photoOrder.flatMap((token) => {
        if (!token.startsWith('n:')) return []
        const photo = newPhotos.find((candidate) => candidate.id === token.slice(2))
        return photo ? [photo.file] : []
      })

      uploadedPaths = await uploadAdditionalDevicePhotos(
        session.user.id,
        deviceId,
        orderedNew,
      )

      let uploadedIndex = 0
      const finalPaths = photoOrder.map((token) =>
        token.startsWith('p:') ? token.slice(2) : uploadedPaths[uploadedIndex++],
      )

      await updatePhoneInventoryItem(deviceId, {
        deviceState,
        purchaseDate,
        sellerName: sellerName.trim() || null,
        sellerPhone: sellerPhone.trim() || null,
        purchaseNotes: purchaseNotes.trim() || null,
        productModelId: selectedModel.id,
        color,
        storageCapacityGb: storage ? Number(storage) : null,
        ramGb: isAppleDevice ? null : ram ? Number(ram) : null,
        imei1,
        imei2: imeiCount === 2 ? imei2 || null : null,
        iphoneRegionCode: isAppleDevice ? region.trim().toUpperCase() || null : null,
        batteryHealthPercent: isUsedIPhone ? battery : null,
        internalNotes: notes.trim() || null,
        salePriceMmk: sale,
        purchasePriceMmk: purchase,
        isPubliclyVisible: isPublic,
        photoPaths: finalPaths,
      })

      const removedPaths = item.photoPaths.filter(
        (path) => !keptPhotoPaths.includes(path),
      )

      if (removedPaths.length) {
        await cleanupUploadedPhotos(removedPaths)
      }

      setSuccessMessage('Phone updated successfully.')

      window.setTimeout(() => {
        navigate('/app/phones', { replace: true })
      }, 1400)
    } catch (caught) {
      if (uploadedPaths.length) await cleanupUploadedPhotos(uploadedPaths)
      setError(caught instanceof Error ? caught.message : 'Failed to update phone.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-3xl bg-white" />
  }

  if (error && (!item || !masterData)) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error}
      </div>
    )
  }

  if (!item || !masterData) return null

  return (
    <section className="pb-28">
      <div className="management-page-hero">
        <div>
          <BackLink to={`/app/phones/${item.id}`}>Back to phone</BackLink>
          <p className="management-eyebrow mt-5">Phone inventory</p>
          <h1 className="management-title">Edit phone</h1>
          <p className="management-subtitle">
            Update purchase, seller, device details and product photos without losing the
            original purchase record.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${isPublic ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isPublic ? 'bg-emerald-500' : 'bg-slate-400'}`}
          />
          {isPublic ? 'Visible on website' : 'Hidden from website'}
        </span>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-live="polite"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-950">
              Changes saved successfully
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Returning to Phone Inventory...
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 sm:space-y-6">
        <section className={sectionClass}>
          <div className="mb-5">
            <p className="text-sm font-semibold text-blue-600">Purchase details</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Transaction information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className={labelClass}>Purchase Type</span>
              <select
                value={deviceState}
                onChange={(event) => setDeviceState(event.target.value as 'new' | 'used')}
                className={fieldClass}
              >
                <option value="used">Used / Second-hand</option>
                <option value="new">New</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Purchase Date</span>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className="space-y-2 sm:col-span-2 xl:col-span-1">
              <span className={labelClass}>Purchased By</span>
              <div
                className={`${fieldClass} flex items-center bg-slate-100 text-slate-700`}
              >
                {purchasedByName}
              </div>
              <p className="text-xs font-medium text-slate-400">
                Original purchase account
              </p>
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                {sourceLabel} information
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Optional - never block the update
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Leave this blank when the {sourceLabel.toLowerCase()} does not want to
                provide personal information.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
              Optional
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>{sourceLabel} Name</span>
              <input
                value={sellerName}
                onChange={(event) => setSellerName(event.target.value)}
                placeholder={`Leave blank for walk-in ${sourceLabel.toLowerCase()}`}
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Phone</span>
              <input
                value={sellerPhone}
                onChange={(event) => setSellerPhone(event.target.value)}
                inputMode="tel"
                placeholder="Optional"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className={labelClass}>Purchase Notes</span>
            <textarea
              value={purchaseNotes}
              onChange={(event) => setPurchaseNotes(event.target.value)}
              rows={2}
              placeholder="Optional notes about this purchase"
              className={`${fieldClass} py-3`}
            />
          </label>
        </section>

        <section className={sectionClass}>
          <div>
            <p className="text-sm font-semibold text-blue-600">Phone</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Device 1</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-2">
              <span className={labelClass}>Brand</span>
              <select
                value={brandId}
                onChange={(event) => chooseBrand(event.target.value)}
                className={fieldClass}
              >
                {masterData.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 lg:col-span-2">
              <span className={labelClass}>Model</span>
              <select
                value={modelId}
                onChange={(event) => chooseModel(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select model</option>
                {modelsForBrand.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>

            {!isAppleDevice && (
              <label className="space-y-2">
                <span className={labelClass}>RAM (GB)</span>
                <input
                  value={ram}
                  onChange={(event) => setRam(event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className={fieldClass}
                />
              </label>
            )}

            <label className="space-y-2">
              <span className={labelClass}>Color</span>
              <select
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select color</option>
                {(selectedModel?.colors ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Storage</span>
              <select
                value={storage}
                onChange={(event) => setStorage(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select storage</option>
                {(selectedModel?.storageOptionsGb ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value >= 1024 ? `${value / 1024} TB` : `${value} GB`}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>IMEI 1</span>
              <div className="relative">
                <input
                  value={imei1}
                  onChange={(event) => setImei1(digitsOnly(event.target.value))}
                  inputMode="numeric"
                  maxLength={15}
                  className={`${fieldClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {imei1.length}/15
                </span>
              </div>
            </label>

            {imeiCount === 2 && (
              <label className="space-y-2">
                <span className={labelClass}>
                  IMEI 2 <span className="font-medium text-slate-400">(Optional)</span>
                </span>
                <div className="relative">
                  <input
                    value={imei2}
                    onChange={(event) => setImei2(digitsOnly(event.target.value))}
                    inputMode="numeric"
                    maxLength={15}
                    className={`${fieldClass} pr-14`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {imei2.length}/15
                  </span>
                </div>
              </label>
            )}

            {isAppleDevice && (
              <label className="space-y-2">
                <span className={labelClass}>
                  Region <span className="font-medium text-slate-400">(Optional)</span>
                </span>
                <input
                  value={region}
                  onChange={(event) => setRegion(event.target.value.toUpperCase())}
                  placeholder="LL/A, TH/A, CH/A..."
                  className={fieldClass}
                />
              </label>
            )}

            <label className="space-y-2">
              <span className={labelClass}>Purchase Price (MMK)</span>
              <input
                value={purchasePrice}
                disabled={profile?.role !== 'owner'}
                onChange={(event) => setPurchasePrice(moneyDigits(event.target.value))}
                inputMode="numeric"
                className={fieldClass}
              />
              {profile?.role !== 'owner' && (
                <p className="text-xs font-medium text-slate-400">
                  Owner-only cost correction
                </p>
              )}
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Sale Price (MMK)</span>
              <input
                value={salePrice}
                onChange={(event) => setSalePrice(moneyDigits(event.target.value))}
                inputMode="numeric"
                className={fieldClass}
              />
            </label>
          </div>

          {isUsedIPhone && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className={labelClass}>Battery Health (%)</span>
                <input
                  value={batteryHealth}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '')
                    setBatteryHealth(
                      digits === '' ? '' : String(Math.min(100, Number(digits))),
                    )
                  }}
                  inputMode="numeric"
                  className={fieldClass}
                />
              </label>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-600">Product photos</p>
                <h3 className="mt-1 font-bold text-slate-950">
                  Photos optional - up to 6 photos
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add, remove or reorder photos. The first photo is the cover.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {totalPhotos}/6
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photoOrder.map((token, index) => {
                const isExisting = token.startsWith('p:')
                const path = isExisting ? token.slice(2) : null
                const fresh = !isExisting
                  ? newPhotos.find((photo) => photo.id === token.slice(2))
                  : null
                const src = path ? getDevicePhotoUrl(path) : fresh?.previewUrl
                if (!src) return null

                return (
                  <div
                    key={token}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={src}
                        className="h-full w-full object-cover"
                        alt={`Phone photo ${index + 1}`}
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-950/85 px-2 py-1 text-[10px] font-bold text-white">
                          Cover
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 p-2">
                      <button
                        type="button"
                        disabled={index === 0 || isSaving}
                        onClick={() => movePhoto(index, -1)}
                        className="min-h-9 rounded-lg px-2 font-bold text-slate-600 disabled:opacity-25"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => removePhoto(token)}
                        className="min-h-9 rounded-lg px-2 text-xs font-bold text-red-600 disabled:opacity-50"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        disabled={index === photoOrder.length - 1 || isSaving}
                        onClick={() => movePhoto(index, 1)}
                        className="min-h-9 rounded-lg px-2 font-bold text-slate-600 disabled:opacity-25"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )
              })}

              {totalPhotos < MAX_PHOTOS && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center text-sm font-bold text-slate-500">
                  <span>+ Add photos</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={addPhotos}
                    disabled={isSaving}
                  />
                </label>
              )}
            </div>
          </div>

          <label className="mt-4 block space-y-2">
            <span className={labelClass}>Internal Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Condition, repair history, accessories, defects..."
              className={`${fieldClass} py-3`}
            />
          </label>

          <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="h-5 w-5"
            />
            Show this phone on the public website
          </label>
        </section>

        <div className="fixed inset-x-2 bottom-[5.6rem] z-50 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl shadow-slate-900/10 backdrop-blur lg:static lg:inset-auto lg:z-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mx-auto flex max-w-3xl gap-2.5 lg:justify-end">
            <Link
              to={`/app/phones/${item.id}`}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 lg:flex-none lg:rounded-2xl lg:px-5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-12 flex-[2] rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 disabled:opacity-60 lg:flex-none lg:rounded-2xl lg:px-6"
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

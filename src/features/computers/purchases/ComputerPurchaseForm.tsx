import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChangeEvent } from 'react'

import { supabase } from '../../../lib/supabase/client'
import { createComputerPurchase } from './computerPurchaseApi'
import {
  COMPUTER_PHOTO_MAX_COUNT,
  COMPUTER_PHOTO_MAX_ORIGINAL_BYTES,
  validateComputerPhoto,
} from './computerPhotoUpload'
import { ContactPicker } from '../../contacts/ContactPicker'

type SelectedPhoto = {
  id: string
  file: File
  previewUrl: string
}

function todayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const initialForm = {
  computerType: '',
  brand: '',
  model: '',
  cpu: '',
  ram: '',
  primaryStorageType: '',
  primaryStorageSize: '',
  secondaryStorageType: '',
  secondaryStorageSize: '',
  gpu: '',
  screenSize: '',
  color: '',
  serialNumber: '',
  condition: 'Used',
  purchaseFrom: '',
  sellerPhone: '',
  purchaseNotes: '',
  purchaseDate: todayDate(),
  purchasePrice: '',
  salePrice: '',
  internalNotes: '',
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

const fieldClass =
  'min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-100 disabled:text-slate-400'

const labelClass = 'text-sm font-bold text-slate-800'

const sectionClass = 'premium-form-card'

export default function ComputerPurchaseForm() {
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const photosRef = useRef<SelectedPhoto[]>([])
  const [photoError, setPhotoError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('Current user')

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl)
      })
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    let active = true

    async function loadCurrentUserName() {
      const {
        data: { user },
      } = await client.auth.getUser()

      if (!user || !active) return

      const { data } = await client
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

      if (active && data?.full_name) {
        setCurrentUserName(data.full_name)
      }
    }

    void loadCurrentUserName()

    return () => {
      active = false
    }
  }, [])

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!files.length) return

    setPhotoError('')

    const remaining = COMPUTER_PHOTO_MAX_COUNT - photos.length

    if (remaining <= 0) {
      setPhotoError(`Maximum ${COMPUTER_PHOTO_MAX_COUNT} photos allowed.`)
      return
    }

    if (files.length > remaining) {
      setPhotoError(
        `You can only add ${remaining} more photo${remaining === 1 ? '' : 's'}.`,
      )
      return
    }

    for (const file of files) {
      const error = validateComputerPhoto(file)

      if (error) {
        setPhotoError(error)
        return
      }
    }

    const newPhotos: SelectedPhoto[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id)

      if (target) {
        URL.revokeObjectURL(target.previewUrl)
      }

      return prev.filter((photo) => photo.id !== id)
    })

    setPhotoError('')
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((prev) => {
      const targetIndex = index + direction

      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev
      }

      const next = [...prev]
      const current = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = current
      return next
    })
  }

  function validateForm() {
    if (!form.computerType) return 'Computer Type is required.'
    if (!form.brand) return 'Brand is required.'
    if (!form.model.trim()) return 'Model is required.'
    if (!form.serialNumber.trim()) return 'Serial Number is required.'

    if (photos.length > COMPUTER_PHOTO_MAX_COUNT) {
      return `Maximum ${COMPUTER_PHOTO_MAX_COUNT} photos allowed.`
    }

    const purchasePrice = Number(form.purchasePrice)
    const salePrice = Number(form.salePrice)

    if (
      form.purchasePrice.trim() === '' ||
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      return 'Enter a valid Purchase Price.'
    }

    if (form.salePrice.trim() === '' || !Number.isFinite(salePrice) || salePrice < 0) {
      return 'Enter a valid Sale Price.'
    }

    return null
  }

  async function handleSave() {
    if (isSaving) return

    setSaveError('')
    setPhotoError('')
    setSuccessMessage('')

    const validationError = validateForm()

    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsSaving(true)

    try {
      await createComputerPurchase(
        {
          computerType: form.computerType,
          brand: form.brand,
          model: form.model,
          cpu: form.cpu,
          ram: form.ram,
          primaryStorageType: form.primaryStorageType,
          primaryStorageSize: form.primaryStorageSize,
          secondaryStorageType: form.secondaryStorageType,
          secondaryStorageSize: form.secondaryStorageSize,
          gpu: form.gpu,
          screenSize: form.screenSize,
          color: form.color,
          serialNumber: form.serialNumber,
          condition: form.condition,
          purchaseFrom: form.purchaseFrom,
          sellerPhone: form.sellerPhone,
          purchaseNotes: form.purchaseNotes,
          purchaseDate: form.purchaseDate,
          purchasePrice: Number(form.purchasePrice),
          salePrice: Number(form.salePrice),
          internalNotes: form.internalNotes,
        },
        photos.map((photo) => photo.file),
      )

      setSuccessMessage('Computer has been received into inventory.')

      await wait(1400)

      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl)
      })

      navigate('/app/computers', {
        replace: true,
      })
    } catch (error) {
      console.error(error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save computer.')
    } finally {
      setIsSaving(false)
    }
  }

  const sourceLabel = form.condition === 'Used' ? 'Seller' : 'Supplier'

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {saveError && (
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-red-50/90 p-4 shadow-sm shadow-red-100/40 sm:p-5"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-100 font-bold text-red-700">
                !
              </span>
              <div>
                <p className="font-bold text-red-800">Purchase could not be saved</p>
                <p className="mt-1 text-sm leading-6 text-red-700">{saveError}</p>
              </div>
            </div>
          </div>
        )}

        <section className={sectionClass}>
          <div className="mb-5">
            <p className="text-sm font-semibold text-brand-600">Purchase details</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Transaction information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className={labelClass}>Purchase Type</span>
              <select
                value={form.condition}
                onChange={(event) => updateField('condition', event.target.value)}
                className={fieldClass}
              >
                <option value="Used">Used / Second-hand</option>
                <option value="New">New</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Purchase Date</span>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(event) => updateField('purchaseDate', event.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Purchased By</span>
              <div
                className={`${fieldClass} flex items-center bg-slate-100 text-slate-700`}
                title="Automatically set to the signed-in account"
              >
                {currentUserName}
              </div>
              <p className="text-xs font-medium text-slate-400">Signed-in account</p>
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-600">
                {sourceLabel} information
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Optional - never block the purchase
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
              <ContactPicker
                kind="supplier"
                name={form.purchaseFrom}
                phone={form.sellerPhone}
                onChange={(value) => {
                  updateField('purchaseFrom', value.name)
                  updateField('sellerPhone', value.phone)
                }}
                placeholder={`Leave blank for walk-in ${sourceLabel.toLowerCase()}`}
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Phone</span>
              <input
                value={form.sellerPhone}
                onChange={(event) => updateField('sellerPhone', event.target.value)}
                inputMode="tel"
                placeholder="Optional"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className={labelClass}>Purchase Notes</span>
            <textarea
              value={form.purchaseNotes}
              onChange={(event) => updateField('purchaseNotes', event.target.value)}
              rows={2}
              placeholder="Optional notes about this purchase"
              className={`${fieldClass} py-3`}
            />
          </label>
        </section>

        <section className={sectionClass}>
          <div>
            <p className="text-sm font-semibold text-brand-600">Computer</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Device 1</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className={labelClass}>Computer Type</span>
              <select
                value={form.computerType}
                onChange={(event) => updateField('computerType', event.target.value)}
                className={fieldClass}
              >
                <option value="">Select type</option>
                <option value="Laptop">Laptop</option>
                <option value="MacBook">MacBook</option>
                <option value="Desktop PC">Desktop PC</option>
                <option value="All-in-One">All-in-One</option>
                <option value="Mini PC">Mini PC</option>
                <option value="Workstation">Workstation</option>
                <option value="Gaming PC">Gaming PC</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Brand</span>
              <select
                value={form.brand}
                onChange={(event) => updateField('brand', event.target.value)}
                className={fieldClass}
              >
                <option value="">Select brand</option>
                <option>Apple</option>
                <option>Dell</option>
                <option>HP</option>
                <option>Lenovo</option>
                <option>Asus</option>
                <option>Acer</option>
                <option>MSI</option>
                <option>Microsoft</option>
                <option>Razer</option>
                <option>Gigabyte</option>
                <option>Samsung</option>
                <option>Huawei</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Model</span>
              <input
                value={form.model}
                onChange={(event) => updateField('model', event.target.value)}
                placeholder="HP EliteBook 840 G5"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>CPU</span>
              <input
                value={form.cpu}
                onChange={(event) => updateField('cpu', event.target.value)}
                placeholder="Intel Core i5 8th Gen"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>RAM</span>
              <select
                value={form.ram}
                onChange={(event) => updateField('ram', event.target.value)}
                className={fieldClass}
              >
                <option value="">Select RAM</option>
                <option>4GB</option>
                <option>8GB</option>
                <option>16GB</option>
                <option>32GB</option>
                <option>64GB</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Serial Number</span>
              <input
                value={form.serialNumber}
                onChange={(event) => updateField('serialNumber', event.target.value)}
                placeholder="C02Z12345678"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Primary Storage Type</span>
              <select
                value={form.primaryStorageType}
                onChange={(event) =>
                  updateField('primaryStorageType', event.target.value)
                }
                className={fieldClass}
              >
                <option value="">Select type</option>
                <option>SSD</option>
                <option>HDD</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Primary Storage Size</span>
              <select
                value={form.primaryStorageSize}
                onChange={(event) =>
                  updateField('primaryStorageSize', event.target.value)
                }
                className={fieldClass}
              >
                <option value="">Select size</option>
                <option>128GB</option>
                <option>256GB</option>
                <option>512GB</option>
                <option>1TB</option>
                <option>2TB</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Secondary Storage Type</span>
              <select
                value={form.secondaryStorageType}
                onChange={(event) => {
                  const value = event.target.value
                  updateField('secondaryStorageType', value)

                  if (!value) {
                    updateField('secondaryStorageSize', '')
                  }
                }}
                className={fieldClass}
              >
                <option value="">None</option>
                <option>SSD</option>
                <option>HDD</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Secondary Storage Size</span>
              <select
                value={form.secondaryStorageSize}
                onChange={(event) =>
                  updateField('secondaryStorageSize', event.target.value)
                }
                disabled={!form.secondaryStorageType}
                className={fieldClass}
              >
                <option value="">None</option>
                <option>128GB</option>
                <option>256GB</option>
                <option>512GB</option>
                <option>1TB</option>
                <option>2TB</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>GPU</span>
              <input
                value={form.gpu}
                onChange={(event) => updateField('gpu', event.target.value)}
                placeholder="Intel Graphics / NVIDIA RTX / Apple GPU"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Screen Size</span>
              <input
                value={form.screenSize}
                onChange={(event) => updateField('screenSize', event.target.value)}
                placeholder="14 inch"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Color</span>
              <input
                value={form.color}
                onChange={(event) => updateField('color', event.target.value)}
                placeholder="Space Gray"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Purchase Price (MMK)</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.purchasePrice}
                onChange={(event) =>
                  updateField('purchasePrice', digitsOnly(event.target.value))
                }
                placeholder="0"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Sale Price (MMK)</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.salePrice}
                onChange={(event) =>
                  updateField('salePrice', digitsOnly(event.target.value))
                }
                placeholder="0"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="mt-5 block space-y-2">
            <span className={labelClass}>Internal Notes</span>
            <textarea
              value={form.internalNotes}
              onChange={(event) => updateField('internalNotes', event.target.value)}
              rows={4}
              placeholder="Condition, repair history, accessories, defects..."
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
            />
            <p className="text-xs font-medium text-slate-400">
              Internal staff note only. This is not shown on the public catalog.
            </p>
          </label>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-600">Product photos</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">
                  Photos optional - up to {COMPUTER_PHOTO_MAX_COUNT} photos
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  You can save without photos, add 1 photo, or add more later. The first
                  photo is the cover.
                </p>
              </div>

              <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {photos.length}/{COMPUTER_PHOTO_MAX_COUNT} - optional
              </span>
            </div>

            {photos.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={photo.previewUrl}
                        alt={`Computer preview ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-bold text-white">
                          Cover
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => movePhoto(index, -1)}
                        className="min-h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={index === photos.length - 1}
                        onClick={() => movePhoto(index, 1)}
                        className="min-h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="mt-2 min-h-10 w-full rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="mt-4 grid min-h-28 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePhotoChange}
              />
              <div>
                <p className="font-bold text-slate-900">+ Take or add photos</p>
                <p className="mt-1 text-sm text-slate-500">
                  Camera or gallery - max{' '}
                  {Math.round(COMPUTER_PHOTO_MAX_ORIGINAL_BYTES / 1024 / 1024)} MB each
                </p>
              </div>
            </label>

            {photoError && (
              <p className="mt-3 text-sm font-semibold text-red-600">{photoError}</p>
            )}
          </div>
        </section>

        <div className="sticky bottom-3 z-20 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={isSaving}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-950/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSaving ? 'Saving purchase...' : 'Save Purchase - 1 computer'}
            </button>
          </div>
        </div>
      </div>

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
              Purchase saved successfully
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Returning to Computer Inventory...
            </p>
          </div>
        </div>
      )}
    </>
  )
}

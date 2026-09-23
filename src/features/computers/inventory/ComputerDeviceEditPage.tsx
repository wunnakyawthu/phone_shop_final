import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { createClientId } from '../../../lib/id'
import { BackLink } from '../../../components/navigation/BackLink'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../../auth/AuthProvider'
import {
  cleanupComputerPhotos,
  COMPUTER_PHOTO_MAX_COUNT,
  getComputerPhotoUrl,
  uploadComputerEditPhotos,
  validateComputerPhoto,
} from '../purchases/computerPhotoUpload'

type ExistingPhoto = {
  kind: 'existing'
  id: string
  storagePath: string
}

type NewPhoto = {
  kind: 'new'
  id: string
  file: File
  previewUrl: string
}

type EditablePhoto = ExistingPhoto | NewPhoto

type ComputerType = 'macbook' | 'windows_laptop' | 'all_in_one' | 'desktop_system_unit'

type ComputerCondition = 'new' | 'used'

type ComputerForm = {
  computerType: ComputerType
  brand: string
  model: string
  cpu: string
  ram: string
  primaryStorageType: string
  primaryStorageSize: string
  secondaryStorageType: string
  secondaryStorageSize: string
  gpu: string
  screenSize: string
  color: string
  serialNumber: string
  condition: ComputerCondition
  purchaseFrom: string
  sellerPhone: string
  purchaseNotes: string
  purchaseDate: string
  purchasePrice: string
  salePrice: string
  internalNotes: string
}

const emptyForm: ComputerForm = {
  computerType: 'windows_laptop',
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
  condition: 'used',
  purchaseFrom: '',
  sellerPhone: '',
  purchaseNotes: '',
  purchaseDate: '',
  purchasePrice: '',
  salePrice: '',
  internalNotes: '',
}

const fieldClass =
  'min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-400'
const labelClass = 'text-sm font-bold text-slate-800'
const sectionClass = 'premium-form-card'

function moneyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return ''
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? ''
}

export default function ComputerDeviceEditPage() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [form, setForm] = useState<ComputerForm>(emptyForm)
  const [purchasedByName, setPurchasedByName] = useState('Not recorded')
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(false)
  const [photos, setPhotos] = useState<EditablePhoto[]>([])
  const [photoError, setPhotoError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadComputer() {
      if (!deviceId) {
        setErrorMessage('Computer ID is missing.')
        setLoading(false)
        return
      }

      if (!supabase) {
        setErrorMessage('Supabase client is not configured.')
        setLoading(false)
        return
      }

      try {
        const [computerResult, photosResult] = await Promise.all([
          supabase
            .from('computer_inventory_items')
            .select('*')
            .eq('id', deviceId)
            .eq('is_deleted', false)
            .single(),
          supabase
            .from('computer_inventory_photos')
            .select('id, storage_path, sort_order')
            .eq('computer_id', deviceId)
            .order('sort_order', { ascending: true }),
        ])

        if (computerResult.error) throw computerResult.error
        if (photosResult.error) throw photosResult.error

        const data = computerResult.data

        setPhotos(
          (photosResult.data ?? []).map((photo) => ({
            kind: 'existing' as const,
            id: photo.id,
            storagePath: photo.storage_path,
          })),
        )

        setForm({
          computerType: data.computer_type as ComputerType,
          brand: data.brand ?? '',
          model: data.model_name ?? '',
          cpu: data.cpu ?? '',
          ram: data.ram ?? '',
          primaryStorageType: data.primary_storage_type ?? '',
          primaryStorageSize: data.primary_storage_size ?? '',
          secondaryStorageType: data.secondary_storage_type ?? '',
          secondaryStorageSize: data.secondary_storage_size ?? '',
          gpu: data.gpu ?? '',
          screenSize: data.screen_size ?? '',
          color: data.color ?? '',
          serialNumber: data.serial_number ?? '',
          condition: (data.condition ?? 'used') as ComputerCondition,
          purchaseFrom: data.purchase_from ?? '',
          sellerPhone: data.seller_phone ?? '',
          purchaseNotes: data.purchase_notes ?? '',
          purchaseDate:
            dateInputValue(data.purchase_date) || dateInputValue(data.created_at),
          purchasePrice: data.purchase_price !== null ? String(data.purchase_price) : '',
          salePrice: data.sale_price !== null ? String(data.sale_price) : '',
          internalNotes: data.internal_notes ?? '',
        })

        setIsPubliclyVisible(data.is_publicly_visible ?? false)

        if (data.purchased_by_user_id) {
          const { data: purchaser, error: purchaserError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.purchased_by_user_id)
            .maybeSingle()

          if (purchaserError) throw purchaserError
          setPurchasedByName(purchaser?.full_name ?? 'Unknown staff')
        }
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load this computer.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadComputer()
  }, [deviceId])

  function updateField<K extends keyof ComputerForm>(field: K, value: ComputerForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) return

    setPhotoError('')

    if (photos.length + files.length > COMPUTER_PHOTO_MAX_COUNT) {
      const remaining = COMPUTER_PHOTO_MAX_COUNT - photos.length
      setPhotoError(
        `You can only add ${remaining} more photo${remaining === 1 ? '' : 's'}.`,
      )
      return
    }

    for (const file of files) {
      const validationError = validateComputerPhoto(file)
      if (validationError) {
        setPhotoError(validationError)
        return
      }
    }

    const newPhotos: NewPhoto[] = files.map((file) => ({
      kind: 'new',
      id: createClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setPhotos((current) => [...current, ...newPhotos])
  }

  function removePhoto(index: number) {
    setPhotoError('')

    setPhotos((current) => {
      const target = current[index]
      if (target?.kind === 'new') {
        URL.revokeObjectURL(target.previewUrl)
      }

      return current.filter((_, photoIndex) => photoIndex !== index)
    })
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= photos.length) return

    setPhotos((current) => {
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!deviceId || !supabase || saving) return

    setErrorMessage('')
    setPhotoError('')
    setSuccessMessage('')

    const serialNumber = form.serialNumber.trim()

    if (!form.purchaseDate) {
      setErrorMessage('Purchase Date is required.')
      return
    }

    if (!serialNumber) {
      setErrorMessage('Serial Number is required.')
      return
    }

    if (!form.model.trim()) {
      setErrorMessage('Model is required.')
      return
    }

    if (!form.primaryStorageType || !form.primaryStorageSize) {
      setErrorMessage('Primary storage type and size are required.')
      return
    }

    if (
      (form.secondaryStorageType && !form.secondaryStorageSize) ||
      (!form.secondaryStorageType && form.secondaryStorageSize)
    ) {
      setErrorMessage(
        'Please select both secondary storage type and size, or leave both empty.',
      )
      return
    }

    if (photos.length > COMPUTER_PHOTO_MAX_COUNT) {
      setPhotoError(`A computer can have at most ${COMPUTER_PHOTO_MAX_COUNT} photos.`)
      return
    }

    const purchasePrice = Number(form.purchasePrice)
    const salePrice = Number(form.salePrice)

    if (form.purchasePrice && (!Number.isFinite(purchasePrice) || purchasePrice < 0)) {
      setErrorMessage('Purchase Price is invalid.')
      return
    }

    if (form.salePrice && (!Number.isFinite(salePrice) || salePrice < 0)) {
      setErrorMessage('Sale Price is invalid.')
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('You must be signed in to update this computer.')
      }

      const newPhotoFiles = photos
        .filter((photo): photo is NewPhoto => photo.kind === 'new')
        .map((photo) => photo.file)

      let uploadedPaths: string[] = []

      try {
        uploadedPaths = await uploadComputerEditPhotos(user.id, deviceId, newPhotoFiles)

        const finalPhotoPaths: string[] = []
        let uploadedIndex = 0

        for (const photo of photos) {
          if (photo.kind === 'existing') {
            finalPhotoPaths.push(photo.storagePath)
          } else {
            finalPhotoPaths.push(uploadedPaths[uploadedIndex])
            uploadedIndex += 1
          }
        }

        const existingPhotos = photos.filter(
          (photo): photo is ExistingPhoto => photo.kind === 'existing',
        )

        const { data: originalPhotos, error: originalPhotosError } = await supabase
          .from('computer_inventory_photos')
          .select('id, storage_path')
          .eq('computer_id', deviceId)

        if (originalPhotosError) throw originalPhotosError

        const keptExistingIds = new Set(existingPhotos.map((photo) => photo.id))

        const removedPhotoPaths = (originalPhotos ?? [])
          .filter((photo) => !keptExistingIds.has(photo.id))
          .map((photo) => photo.storage_path)

        const { error: updateError } = await supabase
          .from('computer_inventory_items')
          .update({
            computer_type: form.computerType,
            brand: form.brand.trim() || null,
            model_name: form.model.trim(),
            cpu: form.cpu.trim() || null,
            ram: form.ram || null,
            primary_storage_type: form.primaryStorageType,
            primary_storage_size: form.primaryStorageSize,
            secondary_storage_type: form.secondaryStorageType || null,
            secondary_storage_size: form.secondaryStorageSize || null,
            gpu: form.gpu.trim() || null,
            screen_size: form.screenSize.trim() || null,
            color: form.color.trim() || null,
            serial_number: serialNumber,
            condition: form.condition,
            purchase_from: form.purchaseFrom.trim() || null,
            seller_phone: form.sellerPhone.trim() || null,
            purchase_notes: form.purchaseNotes.trim() || null,
            purchase_date: form.purchaseDate,
            ...(profile?.role === 'owner' && form.purchasePrice
              ? { purchase_price: purchasePrice }
              : {}),
            ...(form.salePrice ? { sale_price: salePrice } : {}),
            internal_notes: form.internalNotes.trim() || null,
            is_publicly_visible: isPubliclyVisible,
          })
          .eq('id', deviceId)
          .eq('is_deleted', false)

        if (updateError) {
          if (
            updateError.code === '23505' ||
            updateError.message.toLowerCase().includes('serial')
          ) {
            throw new Error('This Serial Number already exists in inventory.')
          }

          throw updateError
        }

        const { error: deletePhotoRowsError } = await supabase
          .from('computer_inventory_photos')
          .delete()
          .eq('computer_id', deviceId)

        if (deletePhotoRowsError) throw deletePhotoRowsError

        if (finalPhotoPaths.length > 0) {
          const photoRows = finalPhotoPaths.map((storagePath, index) => ({
            computer_id: deviceId,
            storage_path: storagePath,
            sort_order: index,
          }))

          const { error: insertPhotoRowsError } = await supabase
            .from('computer_inventory_photos')
            .insert(photoRows)

          if (insertPhotoRowsError) throw insertPhotoRowsError
        }

        if (removedPhotoPaths.length > 0) {
          await cleanupComputerPhotos(removedPhotoPaths)
        }

        uploadedPaths = []
      } catch (saveError) {
        if (uploadedPaths.length > 0) {
          await cleanupComputerPhotos(uploadedPaths)
        }
        throw saveError
      }

      setSuccessMessage('Computer updated successfully.')

      window.setTimeout(() => {
        navigate('/app/computers', { replace: true })
      }, 1400)
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update computer.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-72 animate-pulse rounded-3xl bg-white" />
  }

  const sourceLabel = form.condition === 'used' ? 'Seller' : 'Supplier'

  return (
    <section className="pb-28">
      <div className="management-page-hero">
        <div>
          <BackLink to={deviceId ? `/app/computers/${deviceId}` : '/app/computers'}>
            Back to computer
          </BackLink>
          <p className="management-eyebrow mt-5">Computer inventory</p>
          <h1 className="management-title">Edit computer</h1>
          <p className="management-subtitle">
            Update purchase, seller, device details and product photos while keeping the
            original purchase account.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${isPubliclyVisible ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isPubliclyVisible ? 'bg-emerald-500' : 'bg-slate-400'}`}
          />
          {isPubliclyVisible ? 'Visible on website' : 'Hidden from website'}
        </span>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
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
              Returning to Computer Inventory...
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className={labelClass}>Purchase Type</span>
              <select
                value={form.condition}
                onChange={(event) =>
                  updateField('condition', event.target.value as ComputerCondition)
                }
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
                value={form.purchaseDate}
                onChange={(event) => updateField('purchaseDate', event.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
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
                value={form.purchaseFrom}
                onChange={(event) => updateField('purchaseFrom', event.target.value)}
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
            <p className="text-sm font-semibold text-blue-600">Computer</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Device 1</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className={labelClass}>Computer Type</span>
              <select
                value={form.computerType}
                onChange={(event) =>
                  updateField('computerType', event.target.value as ComputerType)
                }
                className={fieldClass}
              >
                <option value="windows_laptop">Laptop</option>
                <option value="macbook">MacBook</option>
                <option value="desktop_system_unit">Desktop PC</option>
                <option value="all_in_one">All-in-One</option>
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
                {[
                  'Apple',
                  'Dell',
                  'HP',
                  'Lenovo',
                  'Asus',
                  'Acer',
                  'MSI',
                  'Microsoft',
                  'Razer',
                  'Gigabyte',
                  'Samsung',
                  'Huawei',
                ].map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
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
                {['4GB', '8GB', '16GB', '32GB', '64GB', '128GB'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Serial Number</span>
              <input
                value={form.serialNumber}
                onChange={(event) => updateField('serialNumber', event.target.value)}
                placeholder="C02Z12345678"
                autoCapitalize="characters"
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
                <option value="SSD">SSD</option>
                <option value="HDD">HDD</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Primary Storage Size</span>
              <StorageSizeSelect
                value={form.primaryStorageSize}
                onChange={(value) => updateField('primaryStorageSize', value)}
              />
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Secondary Storage Type</span>
              <select
                value={form.secondaryStorageType}
                onChange={(event) => {
                  const value = event.target.value
                  updateField('secondaryStorageType', value)
                  if (!value) updateField('secondaryStorageSize', '')
                }}
                className={fieldClass}
              >
                <option value="">None</option>
                <option value="SSD">SSD</option>
                <option value="HDD">HDD</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className={labelClass}>Secondary Storage Size</span>
              <StorageSizeSelect
                optional
                disabled={!form.secondaryStorageType}
                value={form.secondaryStorageSize}
                onChange={(value) => updateField('secondaryStorageSize', value)}
              />
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
                value={form.purchasePrice}
                disabled={profile?.role !== 'owner'}
                onChange={(event) =>
                  updateField('purchasePrice', moneyDigits(event.target.value))
                }
                inputMode="numeric"
                className={fieldClass}
                placeholder="0"
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
                value={form.salePrice}
                onChange={(event) =>
                  updateField('salePrice', moneyDigits(event.target.value))
                }
                inputMode="numeric"
                className={fieldClass}
                placeholder="0"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-600">Product photos</p>
                <h3 className="mt-1 font-bold text-slate-950">
                  Photos optional - up to {COMPUTER_PHOTO_MAX_COUNT} photos
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add, remove or reorder photos. The first photo is the cover.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {photos.length}/{COMPUTER_PHOTO_MAX_COUNT}
              </span>
            </div>

            {photoError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {photoError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, index) => {
                const src =
                  photo.kind === 'existing'
                    ? getComputerPhotoUrl(photo.storagePath)
                    : photo.previewUrl

                return (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={src}
                        className="h-full w-full object-cover"
                        alt={`Computer photo ${index + 1}`}
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
                        disabled={index === 0 || saving}
                        onClick={() => movePhoto(index, -1)}
                        className="min-h-9 rounded-lg px-2 font-bold text-slate-600 disabled:opacity-25"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removePhoto(index)}
                        className="min-h-9 rounded-lg px-2 text-xs font-bold text-red-600 disabled:opacity-50"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        disabled={index === photos.length - 1 || saving}
                        onClick={() => movePhoto(index, 1)}
                        className="min-h-9 rounded-lg px-2 font-bold text-slate-600 disabled:opacity-25"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )
              })}

              {photos.length < COMPUTER_PHOTO_MAX_COUNT && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center text-sm font-bold text-slate-500">
                  <span>+ Add photos</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={handlePhotoChange}
                    disabled={saving}
                  />
                </label>
              )}
            </div>
          </div>

          <label className="mt-4 block space-y-2">
            <span className={labelClass}>Internal Notes</span>
            <textarea
              value={form.internalNotes}
              onChange={(event) => updateField('internalNotes', event.target.value)}
              rows={3}
              placeholder="Condition, repair history, accessories, defects..."
              className={`${fieldClass} py-3`}
            />
          </label>

          <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isPubliclyVisible}
              onChange={(event) => setIsPubliclyVisible(event.target.checked)}
              className="h-5 w-5"
            />
            Show this computer on the public website
          </label>
        </section>

        <div className="fixed inset-x-2 bottom-[5.6rem] z-50 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl shadow-slate-900/10 backdrop-blur lg:static lg:inset-auto lg:z-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mx-auto flex max-w-3xl gap-2.5 lg:justify-end">
            <Link
              to={deviceId ? `/app/computers/${deviceId}` : '/app/computers'}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 lg:flex-none lg:rounded-2xl lg:px-5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 flex-[2] rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 disabled:opacity-60 lg:flex-none lg:rounded-2xl lg:px-6"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

function StorageSizeSelect({
  value,
  onChange,
  optional = false,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  optional?: boolean
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={fieldClass}
    >
      <option value="">{optional ? 'None' : 'Select size'}</option>
      <option value="128GB">128GB</option>
      <option value="256GB">256GB</option>
      <option value="512GB">512GB</option>
      <option value="1TB">1TB</option>
      <option value="2TB">2TB</option>
      <option value="4TB">4TB</option>
    </select>
  )
}

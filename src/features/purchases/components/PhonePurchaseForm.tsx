import { createClientId } from '../../../lib/id'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import type {
  NewPhoneModelInput,
  PhonePlatform,
  PhonePurchaseDraft,
  PhonePurchaseItemDraft,
  PhonePurchaseMasterData,
  ProductModelOption,
} from '../purchaseTypes'
import { createEmptyPhonePurchaseItem } from '../purchaseTypes'
import type { PhonePurchasePhotoMap, SelectedDevicePhoto } from '../photoTypes'
import {
  DEVICE_PHOTO_MAX_COUNT,
  DEVICE_PHOTO_MAX_ORIGINAL_BYTES,
  validateOriginalPhoto,
} from '../devicePhotoUpload'
import { ContactPicker } from '../../contacts/ContactPicker'

interface PhonePurchaseFormProps {
  masterData: PhonePurchaseMasterData
  currentUserId: string
  currentUserRole: 'owner' | 'manager' | 'phone_staff' | 'computer_staff'
  onSubmit: (
    draft: PhonePurchaseDraft,
    photosByItem: PhonePurchasePhotoMap,
  ) => Promise<void>
  onCreateModel: (input: NewPhoneModelInput) => Promise<ProductModelOption>
}

function todayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const PHONE_PURCHASE_DRAFT_KEY = 'phone-purchase-draft-v4'
type SavedPhonePurchaseDraft = PhonePurchaseDraft

function loadSavedDraft(): SavedPhonePurchaseDraft | null {
  try {
    const saved = sessionStorage.getItem(PHONE_PURCHASE_DRAFT_KEY)
    return saved ? (JSON.parse(saved) as SavedPhonePurchaseDraft) : null
  } catch {
    return null
  }
}

const fieldClass =
  'min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-[16px] font-normal text-slate-900 shadow-sm transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-100 disabled:text-slate-400'
const labelClass = 'text-sm font-semibold text-slate-700'
const sectionClass = 'premium-form-card'

interface ModelEditorState {
  localId: string
  brandId: string
  name: string
  phonePlatform: PhonePlatform
  colorsText: string
  storageText: string
  imeiCount: 1 | 2
  isSaving: boolean
  error: string | null
}

function parseColors(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

function parseStorage(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ].sort((a, b) => a - b)
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '').slice(0, 15)
}

function batteryHealthInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 3)
  if (!digits) return ''
  return String(Math.min(100, Number(digits)))
}

function canonicalizeAppleModelName(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.replace(/^iphone(?=\s|$)/i, 'iPhone')
}

export function PhonePurchaseForm({
  masterData,
  currentUserId,
  onSubmit,
  onCreateModel,
}: PhonePurchaseFormProps) {
  const savedDraft = useMemo(() => loadSavedDraft(), [])

  const [deviceState, setDeviceState] = useState<PhonePurchaseDraft['deviceState']>(
    savedDraft?.deviceState ?? 'used',
  )
  const [sellerSourceType] = useState<
    PhonePurchaseDraft['sellerSourceType']
  >(savedDraft?.sellerSourceType ?? 'seller')
  const [sellerContactId, setSellerContactId] = useState(
    savedDraft?.sellerContactId ?? '',
  )
  const [sellerName, setSellerName] = useState(savedDraft?.sellerName ?? '')
  const [sellerPhone, setSellerPhone] = useState(savedDraft?.sellerPhone ?? '')
  // Purchase accountability is tied to the signed-in account.
  // Draft data must never override these staff IDs.
  const checkedByUserId = currentUserId
  const purchasedByUserId = currentUserId
  const [purchaseDate, setPurchaseDate] = useState(
    savedDraft?.purchaseDate ?? todayDate(),
  )
  const [notes, setNotes] = useState(savedDraft?.notes ?? '')
  const [items, setItems] = useState<PhonePurchaseItemDraft[]>(
    savedDraft?.items?.length ? savedDraft.items : [createEmptyPhonePurchaseItem()],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photosByItem, setPhotosByItem] = useState<Record<string, SelectedDevicePhoto[]>>(
    {},
  )
  const [photoErrorsByItem, setPhotoErrorsByItem] = useState<
    Record<string, string | null>
  >({})
  const [modelInputByItem, setModelInputByItem] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const item of savedDraft?.items ?? []) {
      const model = masterData.models.find(
        (candidate) => candidate.id === item.productModelId,
      )
      if (model) map[item.localId] = model.name
    }
    return map
  })
  const [modelEditor, setModelEditor] = useState<ModelEditorState | null>(null)
  const [modelPickerOpenByItem, setModelPickerOpenByItem] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    const draft: PhonePurchaseDraft = {
      deviceState,
      sellerSourceType,
      sellerContactId,
      sellerName,
      sellerPhone,
      checkedByUserId,
      purchasedByUserId,
      purchaseDate,
      notes,
      items,
    }

    try {
      sessionStorage.setItem(PHONE_PURCHASE_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Draft autosave is best-effort only.
    }
  }, [
    deviceState,
    sellerSourceType,
    sellerContactId,
    sellerName,
    sellerPhone,
    checkedByUserId,
    purchasedByUserId,
    purchaseDate,
    notes,
    items,
  ])

  const modelById = useMemo(
    () => new Map(masterData.models.map((model) => [model.id, model])),
    [masterData.models],
  )
  const brandById = useMemo(
    () => new Map(masterData.brands.map((brand) => [brand.id, brand])),
    [masterData.brands],
  )

  function updateItem(localId: string, changes: Partial<PhonePurchaseItemDraft>) {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...changes } : item)),
    )
  }

  function addItem() {
    setItems((current) => [...current, createEmptyPhonePurchaseItem()])
  }

  function removeItem(localId: string) {
    const photos = photosByItem[localId] ?? []
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    setPhotosByItem((current) => {
      const next = { ...current }
      delete next[localId]
      return next
    })
    setModelInputByItem((current) => {
      const next = { ...current }
      delete next[localId]
      return next
    })
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.localId !== localId),
    )
  }

  function addPhotos(localId: string, event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    const invalidMessages = selectedFiles
      .map((file) => validateOriginalPhoto(file))
      .filter((message): message is string => Boolean(message))
    const validFiles = selectedFiles.filter((file) => !validateOriginalPhoto(file))

    setPhotosByItem((current) => {
      const existing = current[localId] ?? []
      const room = Math.max(0, DEVICE_PHOTO_MAX_COUNT - existing.length)
      const acceptedFiles = validFiles.slice(0, room)
      const added = acceptedFiles.map((file) => ({
        id: createClientId(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))

      const messages = [...invalidMessages]
      if (validFiles.length > room) {
        messages.push(`A device can have at most ${DEVICE_PHOTO_MAX_COUNT} photos.`)
      }
      setPhotoErrorsByItem((errors) => ({
        ...errors,
        [localId]: messages.length ? messages.join(' ') : null,
      }))

      return { ...current, [localId]: [...existing, ...added] }
    })
  }

  function removePhoto(localId: string, photoId: string) {
    setPhotosByItem((current) => {
      const list = current[localId] ?? []
      const target = list.find((photo) => photo.id === photoId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return { ...current, [localId]: list.filter((photo) => photo.id !== photoId) }
    })
  }

  function movePhoto(localId: string, index: number, direction: -1 | 1) {
    setPhotosByItem((current) => {
      const list = [...(current[localId] ?? [])]
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= list.length) return current
      ;[list[index], list[nextIndex]] = [list[nextIndex], list[index]]
      return { ...current, [localId]: list }
    })
  }

  function handleBrandChange(item: PhonePurchaseItemDraft, brandId: string) {
    updateItem(item.localId, {
      brandId,
      productModelId: '',
      color: '',
      storageCapacityGb: '',
      ramGb: '',
      imei1: '',
      imei2: '',
      iphoneRegionCode: '',
    })
    setModelInputByItem((current) => ({ ...current, [item.localId]: '' }))
    setModelPickerOpenByItem((current) => ({
      ...current,
      [item.localId]: Boolean(brandId),
    }))
  }

  function handleModelInput(item: PhonePurchaseItemDraft, value: string) {
    // Keep exactly what the user is typing. Do not replace a partial value with
    // the catalog's canonical casing while typing (for example, typing
    // "iphone " previously matched the legacy "iPhone" model after trim(),
    // which immediately removed the space and made "iPhone 13" impossible to type).
    const normalizedValue = value.trim().replace(/\s+/g, ' ').toLowerCase()
    const exact = masterData.models.find(
      (model) =>
        model.brandId === item.brandId && model.name.toLowerCase() === normalizedValue,
    )

    setModelInputByItem((current) => ({
      ...current,
      [item.localId]: value,
    }))
    setModelPickerOpenByItem((current) => ({ ...current, [item.localId]: true }))
    updateItem(item.localId, {
      productModelId: exact?.id ?? '',
      color: '',
      storageCapacityGb: '',
      ramGb: exact?.phonePlatform === 'iphone' ? '' : item.ramGb,
      imei1: '',
      imei2: '',
      iphoneRegionCode: '',
    })
  }

  function canonicalizeModelInput(item: PhonePurchaseItemDraft) {
    const value = modelInputByItem[item.localId] ?? ''
    const normalizedValue = value.trim().replace(/\s+/g, ' ').toLowerCase()
    const exact = masterData.models.find(
      (model) =>
        model.brandId === item.brandId && model.name.toLowerCase() === normalizedValue,
    )
    if (exact) {
      setModelInputByItem((current) => ({ ...current, [item.localId]: exact.name }))
    }
  }

  function selectModel(item: PhonePurchaseItemDraft, model: ProductModelOption) {
    setModelInputByItem((current) => ({ ...current, [item.localId]: model.name }))
    setModelPickerOpenByItem((current) => ({ ...current, [item.localId]: false }))
    updateItem(item.localId, {
      productModelId: model.id,
      color: '',
      storageCapacityGb: '',
      ramGb: model.phonePlatform === 'iphone' ? '' : item.ramGb,
      imei1: '',
      imei2: '',
      iphoneRegionCode: '',
    })
  }

  function openModelEditor(
    item: PhonePurchaseItemDraft,
    name: string,
    existing?: ProductModelOption,
  ) {
    const brand = brandById.get(item.brandId)
    const isApple = brand?.name.toLowerCase() === 'apple'
    setModelEditor({
      localId: item.localId,
      brandId: item.brandId,
      name: existing?.name ?? name.trim(),
      phonePlatform: isApple ? 'iphone' : (existing?.phonePlatform ?? 'android'),
      colorsText: existing?.colors.join(', ') ?? '',
      storageText: existing?.storageOptionsGb.join(', ') ?? '',
      imeiCount: existing?.imeiCount ?? 2,
      isSaving: false,
      error: null,
    })
  }

  async function saveModelEditor() {
    if (!modelEditor) return
    const colors = parseColors(modelEditor.colorsText)
    const storageOptionsGb = parseStorage(modelEditor.storageText)
    if (!modelEditor.name.trim()) {
      setModelEditor({ ...modelEditor, error: 'Model name is required.' })
      return
    }
    if (colors.length === 0) {
      setModelEditor({ ...modelEditor, error: 'Enter at least one color.' })
      return
    }
    if (storageOptionsGb.length === 0) {
      setModelEditor({ ...modelEditor, error: 'Enter at least one storage size.' })
      return
    }

    setModelEditor({ ...modelEditor, isSaving: true, error: null })
    try {
      const editorBrand = brandById.get(modelEditor.brandId)
      const normalizedModelName =
        editorBrand?.name.toLowerCase() === 'apple'
          ? canonicalizeAppleModelName(modelEditor.name)
          : modelEditor.name.trim().replace(/\s+/g, ' ')
      const model = await onCreateModel({
        brandId: modelEditor.brandId,
        name: normalizedModelName,
        phonePlatform: modelEditor.phonePlatform,
        colors,
        storageOptionsGb,
        imeiCount: modelEditor.imeiCount,
      })
      updateItem(modelEditor.localId, {
        productModelId: model.id,
        color: '',
        storageCapacityGb: '',
        ramGb: model.phonePlatform === 'iphone' ? '' : '',
        imei1: '',
        imei2: '',
        iphoneRegionCode: '',
      })
      setModelInputByItem((current) => ({
        ...current,
        [modelEditor.localId]: model.name,
      }))
      setModelEditor(null)
    } catch (error) {
      setModelEditor((current) =>
        current
          ? {
              ...current,
              isSaving: false,
              error: error instanceof Error ? error.message : 'Failed to save model.',
            }
          : current,
      )
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const fileMap: PhonePurchasePhotoMap = {}
      for (const [index, item] of items.entries()) {
        const photos = photosByItem[item.localId] ?? []
        if (photos.length > DEVICE_PHOTO_MAX_COUNT) {
          throw new Error(
            `Device ${index + 1}: A maximum of ${DEVICE_PHOTO_MAX_COUNT} photos is allowed.`,
          )
        }
        fileMap[item.localId] = photos.map((photo) => photo.file)
      }

      await onSubmit(
        {
          deviceState,
          sellerSourceType,
          sellerContactId,
          sellerName,
          sellerPhone,
          checkedByUserId: currentUserId,
          purchasedByUserId: currentUserId,
          purchaseDate,
          notes,
          items,
        },
        fileMap,
      )

      Object.values(photosByItem)
        .flat()
        .forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
      setPhotosByItem({})
      setPhotoErrorsByItem({})
      setModelInputByItem({})
      sessionStorage.removeItem(PHONE_PURCHASE_DRAFT_KEY)
      setDeviceState('used')
      setSellerName('')
      setSellerPhone('')
      setPurchaseDate(todayDate())
      setNotes('')
      setItems([createEmptyPhonePurchaseItem()])
    } finally {
      setIsSubmitting(false)
    }
  }

  const sourceLabel = deviceState === 'used' ? 'Seller' : 'Supplier'

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <section className={sectionClass}>
          <div className="mb-5">
            <p className="text-sm font-semibold text-brand-600">Purchase details</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
              Transaction information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className={labelClass}>Purchase Type</span>
              <select
                value={deviceState}
                onChange={(event) =>
                  setDeviceState(event.target.value as PhonePurchaseDraft['deviceState'])
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
                title="Automatically set to the signed-in account"
              >
                {masterData.staff.find((staff) => staff.id === currentUserId)?.fullName ??
                  'Current user'}
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
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Optional seller details
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
              {(
                <ContactPicker
                  kind="supplier"
                  name={sellerName}
                  phone={sellerPhone}
                  onChange={(value) => {
                    setSellerContactId(value.id ?? '')
                    setSellerName(value.name)
                    setSellerPhone(value.phone)
                  }}
                  placeholder="Search or enter a supplier"
                  className={fieldClass}
                />
              )}
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Phone</span>
              <input
                value={sellerPhone}
                onChange={(event) => {
                  setSellerContactId('')
                  setSellerPhone(event.target.value)
                }}
                inputMode="tel"
                placeholder="Optional"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className={labelClass}>Purchase Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Optional notes about this purchase"
              className={`${fieldClass} py-3`}
            />
          </label>
        </section>

        <section className="space-y-4">
          {items.map((item, index) => {
            const selectedModel = modelById.get(item.productModelId)
            const brand = brandById.get(item.brandId)
            const isAppleBrand = brand?.name.toLowerCase() === 'apple'
            const isAppleDevice =
              isAppleBrand || selectedModel?.phonePlatform === 'iphone'
            const isIPhone = Boolean(
              selectedModel?.name.toLowerCase().startsWith('iphone'),
            )
            const isIPad = Boolean(selectedModel?.name.toLowerCase().startsWith('ipad'))
            const showUsedIPhoneFields = isIPhone && deviceState === 'used'
            const modelsForBrand = masterData.models.filter(
              (model) =>
                model.brandId === item.brandId &&
                !['iphone', 'ipad'].includes(model.name.trim().toLowerCase()),
            )
            const modelInput = modelInputByItem[item.localId] ?? selectedModel?.name ?? ''
            const exactModel = modelsForBrand.find(
              (model) => model.name.toLowerCase() === modelInput.trim().toLowerCase(),
            )
            const filteredModels = modelsForBrand.filter((model) =>
              model.name.toLowerCase().includes(modelInput.trim().toLowerCase()),
            )
            const isModelPickerOpen = Boolean(modelPickerOpenByItem[item.localId])
            const needsSpecs = Boolean(
              selectedModel &&
              (selectedModel.colors.length === 0 ||
                selectedModel.storageOptionsGb.length === 0),
            )
            const imeiCount = selectedModel?.imeiCount ?? 2

            return (
              <article key={item.localId} className={sectionClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-600">Phone</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      Device {index + 1}
                    </h2>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.localId)}
                      disabled={isSubmitting}
                      className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-2">
                    <span className={labelClass}>Brand</span>
                    <select
                      value={item.brandId}
                      onChange={(event) => handleBrandChange(item, event.target.value)}
                      required
                      className={fieldClass}
                    >
                      <option value="">Select brand</option>
                      {masterData.brands.map((brandOption) => (
                        <option key={brandOption.id} value={brandOption.id}>
                          {brandOption.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="relative space-y-2 sm:col-span-1 lg:col-span-2">
                    <label htmlFor={`model-${item.localId}`} className={labelClass}>
                      Model
                    </label>
                    <div className="relative">
                      <input
                        id={`model-${item.localId}`}
                        value={modelInput}
                        onFocus={() =>
                          setModelPickerOpenByItem((current) => ({
                            ...current,
                            [item.localId]: Boolean(item.brandId),
                          }))
                        }
                        onChange={(event) => handleModelInput(item, event.target.value)}
                        onBlur={() => canonicalizeModelInput(item)}
                        disabled={!item.brandId}
                        required
                        autoComplete="off"
                        autoCapitalize="none"
                        placeholder={
                          item.brandId ? 'Search or choose a model' : 'Choose brand first'
                        }
                        className={`${fieldClass} pr-12`}
                      />
                      {item.brandId && (
                        <button
                          type="button"
                          aria-label="Show model choices"
                          onClick={() =>
                            setModelPickerOpenByItem((current) => ({
                              ...current,
                              [item.localId]: !current[item.localId],
                            }))
                          }
                          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-lg text-slate-500"
                        >
                          ▾
                        </button>
                      )}
                    </div>
                    {item.brandId && isModelPickerOpen && (
                      <div className="relative z-30 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10">
                        {(modelInput.trim() ? filteredModels : modelsForBrand).length >
                        0 ? (
                          (modelInput.trim() ? filteredModels : modelsForBrand).map(
                            (model) => (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => selectModel(item, model)}
                                className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[16px] font-semibold transition ${
                                  item.productModelId === model.id
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-slate-800 hover:bg-slate-50'
                                }`}
                              >
                                <span>{model.name}</span>
                                {item.productModelId === model.id && (
                                  <span aria-hidden="true">✓</span>
                                )}
                              </button>
                            ),
                          )
                        ) : (
                          <p className="px-3.5 py-3 text-sm font-medium text-slate-500">
                            No matching model. You can add it below.
                          </p>
                        )}
                      </div>
                    )}
                    {item.brandId && modelInput.trim() && !exactModel && (
                      <button
                        type="button"
                        onClick={() => openModelEditor(item, modelInput)}
                        className="text-sm font-semibold text-brand-600"
                      >
                        + Add “{modelInput.trim()}” as a new model
                      </button>
                    )}
                    {needsSpecs && selectedModel && (
                      <button
                        type="button"
                        onClick={() =>
                          openModelEditor(item, selectedModel.name, selectedModel)
                        }
                        className="text-sm font-semibold text-amber-700"
                      >
                        Configure colors, storage and IMEI options for this model
                      </button>
                    )}
                  </div>

                  {!isAppleDevice && (
                    <label className="space-y-2">
                      <span className={labelClass}>RAM (GB)</span>
                      <input
                        type="number"
                        min="1"
                        value={item.ramGb}
                        onChange={(event) =>
                          updateItem(item.localId, { ramGb: event.target.value })
                        }
                        placeholder="8"
                        className={fieldClass}
                      />
                    </label>
                  )}
                </div>

                {isAppleBrand && !selectedModel && (
                  <p className="mt-3 rounded-2xl bg-blue-50 px-3.5 py-3 text-sm font-medium text-blue-700">
                    Apple selected - RAM is hidden automatically. Choose an iPhone or iPad
                    model to load its colors and storage sizes.
                  </p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className={labelClass}>Color</span>
                    <select
                      value={item.color}
                      onChange={(event) =>
                        updateItem(item.localId, { color: event.target.value })
                      }
                      required
                      disabled={!selectedModel || selectedModel.colors.length === 0}
                      className={fieldClass}
                    >
                      <option value="">Select color</option>
                      {selectedModel?.colors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className={labelClass}>Storage</span>
                    <select
                      value={item.storageCapacityGb}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          storageCapacityGb: event.target.value,
                        })
                      }
                      required
                      disabled={
                        !selectedModel || selectedModel.storageOptionsGb.length === 0
                      }
                      className={fieldClass}
                    >
                      <option value="">Select storage</option>
                      {selectedModel?.storageOptionsGb.map((storage) => (
                        <option key={storage} value={storage}>
                          {storage >= 1024 ? `${storage / 1024} TB` : `${storage} GB`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  className={`mt-4 grid gap-4 ${imeiCount === 2 ? 'sm:grid-cols-2' : ''}`}
                >
                  <label className="space-y-2">
                    <span className={labelClass}>IMEI 1</span>
                    <div className="relative">
                      <input
                        value={item.imei1}
                        onChange={(event) =>
                          updateItem(item.localId, {
                            imei1: digitsOnly(event.target.value),
                          })
                        }
                        required
                        inputMode="numeric"
                        pattern="[0-9]{15}"
                        minLength={15}
                        maxLength={15}
                        autoComplete="off"
                        placeholder="15 digits"
                        className={`${fieldClass} pr-14`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        {item.imei1.length}/15
                      </span>
                    </div>
                  </label>

                  {imeiCount === 2 && (
                    <label className="space-y-2">
                      <span className={labelClass}>
                        IMEI 2{' '}
                        <span className="font-medium text-slate-400">(Optional)</span>
                      </span>
                      <div className="relative">
                        <input
                          value={item.imei2}
                          onChange={(event) =>
                            updateItem(item.localId, {
                              imei2: digitsOnly(event.target.value),
                            })
                          }
                          inputMode="numeric"
                          pattern="[0-9]{15}"
                          maxLength={15}
                          autoComplete="off"
                          placeholder="Optional - 15 digits"
                          className={`${fieldClass} pr-14`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          {item.imei2.length}/15
                        </span>
                      </div>
                    </label>
                  )}
                </div>

                <p className="mt-2 text-sm font-medium leading-5 text-slate-500">
                  IMEI 1 is required and must be exactly 15 digits.{' '}
                  {imeiCount === 2
                    ? 'IMEI 2 is optional; add it only when the phone has one.'
                    : 'This model uses one IMEI.'}
                </p>

                {(isIPhone || isIPad) && (
                  <label className="mt-4 block space-y-2">
                    <span className={labelClass}>
                      Region{' '}
                      <span className="font-medium text-slate-400">(Optional)</span>
                    </span>
                    <input
                      list={`iphone-region-list-${item.localId}`}
                      value={item.iphoneRegionCode ?? ''}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          iphoneRegionCode: event.target.value
                            .toUpperCase()
                            .replace(/\s+/g, '')
                            .slice(0, 12),
                        })
                      }
                      autoCapitalize="characters"
                      autoComplete="off"
                      placeholder="e.g. LL/A, TH/A, CH/A"
                      className={fieldClass}
                    />
                    <datalist id={`iphone-region-list-${item.localId}`}>
                      {[
                        'LL/A',
                        'TH/A',
                        'CH/A',
                        'ZP/A',
                        'ZA/A',
                        'J/A',
                        'KH/A',
                        'VN/A',
                        'MY/A',
                        'TA/A',
                        'PA/A',
                        'X/A',
                      ].map((region) => (
                        <option key={region} value={region} />
                      ))}
                    </datalist>
                    <p className="text-sm leading-5 text-slate-500">
                      Add the device sales region when known. You can also type a region
                      code that is not in the suggestions.
                    </p>
                  </label>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className={labelClass}>Purchase Price (MMK)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.purchasePriceMmk}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          purchasePriceMmk: event.target.value.replace(/\D/g, ''),
                        })
                      }
                      required

                      className={fieldClass}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className={labelClass}>Sale Price (MMK)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.salePriceMmk}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          salePriceMmk: event.target.value.replace(/\D/g, ''),
                        })
                      }
                      required

                      className={fieldClass}
                    />
                  </label>
                </div>

                {showUsedIPhoneFields && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className={labelClass}>Battery Health (%)</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={item.batteryHealthPercent}
                          onChange={(event) =>
                            updateItem(item.localId, {
                              batteryHealthPercent: batteryHealthInput(
                                event.target.value,
                              ),
                            })
                          }
                          inputMode="numeric"
                          pattern="[0-9]{0,3}"
                          maxLength={3}
                          autoComplete="off"
                          placeholder="0–100"
                          className={`${fieldClass} pr-12`}
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                          %
                        </span>
                      </div>
                      <p className="text-sm leading-5 text-slate-500">Maximum 100%.</p>
                    </label>
                  </div>
                )}

                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-600">
                        Product photos
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-950">
                        Photos optional - up to {DEVICE_PHOTO_MAX_COUNT} photos
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        You can save without photos, add 1 photo, or add more later. The
                        first photo is the cover. Images are resized to 1600 px and
                        compressed to WebP at 800 KB or less.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      {photosByItem[item.localId]?.length ?? 0}/{DEVICE_PHOTO_MAX_COUNT} -
                      optional
                    </span>
                  </div>

                  {photoErrorsByItem[item.localId] && (
                    <div
                      role="alert"
                      className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                    >
                      {photoErrorsByItem[item.localId]}
                    </div>
                  )}

                  {(photosByItem[item.localId]?.length ?? 0) > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {(photosByItem[item.localId] ?? []).map((photo, photoIndex) => (
                        <div
                          key={photo.id}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        >
                          <div className="aspect-square overflow-hidden bg-slate-100">
                            <img
                              src={photo.previewUrl}
                              alt={`Device ${index + 1} photo ${photoIndex + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {photoIndex === 0 && (
                            <span className="absolute left-2 top-2 rounded-full bg-slate-950/85 px-2 py-1 text-[10px] font-bold text-white">
                              Cover
                            </span>
                          )}
                          <div className="flex items-center justify-between gap-1 p-2">
                            <button
                              type="button"
                              disabled={photoIndex === 0 || isSubmitting}
                              onClick={() => movePhoto(item.localId, photoIndex, -1)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 disabled:opacity-25"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => removePhoto(item.localId, photo.id)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              disabled={
                                photoIndex ===
                                  (photosByItem[item.localId]?.length ?? 1) - 1 ||
                                isSubmitting
                              }
                              onClick={() => movePhoto(item.localId, photoIndex, 1)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 disabled:opacity-25"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(photosByItem[item.localId]?.length ?? 0) < DEVICE_PHOTO_MAX_COUNT && (
                    <label className="mt-4 flex min-h-28 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        disabled={isSubmitting}
                        onChange={(event) => addPhotos(item.localId, event)}
                      />
                      <span>
                        <span className="block text-base font-bold text-slate-800">
                          + Take or add photos
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          Camera or gallery - max{' '}
                          {Math.round(DEVICE_PHOTO_MAX_ORIGINAL_BYTES / 1024 / 1024)} MB
                          each
                        </span>
                      </span>
                    </label>
                  )}
                </div>

                <label className="mt-4 block space-y-2">
                  <span className={labelClass}>
                    Internal Notes · shown on customer view
                  </span>
                  <textarea
                    value={item.internalNotes}
                    onChange={(event) =>
                      updateItem(item.localId, { internalNotes: event.target.value })
                    }
                    rows={2}
                    placeholder="Customer-facing condition, repair history, accessories or defects..."
                    className={`${fieldClass} py-3`}
                  />
                </label>
              </article>
            )
          })}
        </section>

        <div className="sticky bottom-[5.15rem] z-20 -mx-1 rounded-2xl border border-slate-200/80 bg-white/96 p-2.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:mx-0 sm:rounded-3xl sm:p-3 lg:static lg:flex lg:items-center lg:justify-between lg:shadow-sm">
          <button
            type="button"
            onClick={addItem}
            disabled={isSubmitting}
            className="hidden min-h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:inline-flex lg:items-center"
          >
            + Add another phone
          </button>
          <div className="grid grid-cols-[auto_1fr] gap-2 lg:flex">
            <button
              type="button"
              onClick={addItem}
              disabled={isSubmitting}
              className="min-h-13 rounded-xl border border-slate-200 bg-white px-4 text-lg font-bold sm:rounded-2xl text-slate-700 lg:hidden"
              aria-label="Add another phone"
            >
              +
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-13 rounded-xl bg-slate-950 px-5 text-[15px] font-bold sm:rounded-2xl sm:px-6 sm:text-base text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
            >
              {isSubmitting
                ? 'Saving purchase...'
                : `Save Purchase - ${items.length} ${items.length === 1 ? 'phone' : 'phones'}`}
            </button>
          </div>
        </div>
      </form>

      {modelEditor && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-600">
                  Phone model catalog
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  Add or configure model
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  These options will be reused next time so staff can enter phones faster
                  and with fewer mistakes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModelEditor(null)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-600"
              >
                ×
              </button>
            </div>

            {modelEditor.error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {modelEditor.error}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className={labelClass}>Model name</span>
                <input
                  value={modelEditor.name}
                  onChange={(event) =>
                    setModelEditor({ ...modelEditor, name: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>

              {brandById.get(modelEditor.brandId)?.name.toLowerCase() !== 'apple' && (
                <label className="block space-y-2">
                  <span className={labelClass}>Phone platform</span>
                  <select
                    value={modelEditor.phonePlatform}
                    onChange={(event) =>
                      setModelEditor({
                        ...modelEditor,
                        phonePlatform: event.target.value as PhonePlatform,
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="android">Android</option>
                    <option value="iphone">iPhone</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              )}

              <label className="block space-y-2">
                <span className={labelClass}>Available colors</span>
                <input
                  value={modelEditor.colorsText}
                  onChange={(event) =>
                    setModelEditor({ ...modelEditor, colorsText: event.target.value })
                  }
                  placeholder="Black, White, Blue"
                  className={fieldClass}
                />
                <p className="text-xs text-slate-500">Separate colors with commas.</p>
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>Storage sizes (GB)</span>
                <input
                  value={modelEditor.storageText}
                  onChange={(event) =>
                    setModelEditor({ ...modelEditor, storageText: event.target.value })
                  }
                  inputMode="numeric"
                  placeholder="128, 256, 512"
                  className={fieldClass}
                />
                <p className="text-xs text-slate-500">
                  For 1 TB use 1024; for 2 TB use 2048.
                </p>
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>IMEI numbers on this model</span>
                <select
                  value={modelEditor.imeiCount}
                  onChange={(event) =>
                    setModelEditor({
                      ...modelEditor,
                      imeiCount: Number(event.target.value) as 1 | 2,
                    })
                  }
                  className={fieldClass}
                >
                  <option value={1}>1 IMEI</option>
                  <option value={2}>2 IMEIs</option>
                </select>
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModelEditor(null)}
                disabled={modelEditor.isSaving}
                className="min-h-13 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveModelEditor()}
                disabled={modelEditor.isSaving}
                className="min-h-13 rounded-2xl bg-slate-950 px-4 font-bold text-white"
              >
                {modelEditor.isSaving ? 'Saving…' : 'Save model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

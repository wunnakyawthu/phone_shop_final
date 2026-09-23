import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase/client'
import { cleanupUploadedPhotos, uploadPurchasePhotos } from './devicePhotoUpload'
import type { PhonePurchasePhotoMap } from './photoTypes'
import type {
  CreatedPhonePurchase,
  PhonePurchaseDraft,
  PhonePurchaseMasterData,
  ProductModelOption,
  NewPhoneModelInput,
} from './purchaseTypes'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function optionalNumber(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const number = Number(trimmed)
  if (!Number.isFinite(number)) throw new Error(`Invalid number: ${value}`)
  return number
}

function requiredNumber(value: string, fieldName: string) {
  const trimmed = value.trim()
  if (trimmed === '') throw new Error(`${fieldName} is required.`)
  const number = Number(trimmed)
  if (!Number.isFinite(number)) throw new Error(`${fieldName} must be a valid number.`)
  return number
}

function normalizeIdentifier(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
}

function getPurchaseErrorMessage(error: PostgrestError) {
  const message = error.message ?? ''
  const details = error.details ?? ''
  const combined = `${message} ${details}`.toLowerCase()

  if (error.code === '23505') {
    if (combined.includes('imei') || combined.includes('device_units_imei')) {
      return 'This IMEI already exists in inventory.'
    }
    return 'This record already exists.'
  }

  if (error.code === '23503') {
    return 'Some selected purchase information is no longer valid. Please refresh and try again.'
  }

  if (error.code === '23514') {
    return 'Some device information is invalid. Please check the entered values.'
  }

  if (
    error.code === '42501' ||
    combined.includes('row-level security') ||
    combined.includes('permission denied')
  ) {
    return 'You do not have permission to create this purchase.'
  }

  if (message.trim()) return message
  return 'Failed to save purchase. Please try again.'
}

export async function loadPhonePurchaseMasterData(): Promise<PhonePurchaseMasterData> {
  const client = requireSupabase()

  const [brandsResult, modelsResult, specsResult, profilesResult, rolesResult] =
    await Promise.all([
      client
        .from('brands')
        .select('id, name, category')
        .eq('is_active', true)
        .order('name'),
      client
        .from('product_models')
        .select('id, brand_id, name, phone_platform')
        .eq('category', 'phone')
        .eq('is_active', true)
        .order('name'),
      client
        .from('phone_model_specs')
        .select('product_model_id, colors, storage_options_gb, imei_count'),
      client
        .from('profiles')
        .select('id, full_name, is_active')
        .eq('is_active', true)
        .order('full_name'),
      client
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['owner', 'manager', 'phone_staff']),
    ])

  if (brandsResult.error) throw brandsResult.error
  if (modelsResult.error) throw modelsResult.error
  if (specsResult.error) throw specsResult.error
  if (profilesResult.error) throw profilesResult.error
  if (rolesResult.error) throw rolesResult.error

  const brands = brandsResult.data.filter(
    (brand) => brand.category === null || brand.category === 'phone',
  )

  const brandNameById = new Map(brandsResult.data.map((brand) => [brand.id, brand.name]))

  const specsByModelId = new Map(
    specsResult.data.map((spec) => [spec.product_model_id, spec]),
  )

  const models: ProductModelOption[] = modelsResult.data
    .filter((model) => model.phone_platform !== null)
    .map((model) => {
      const spec = specsByModelId.get(model.id)
      return {
        id: model.id,
        brandId: model.brand_id,
        brandName: brandNameById.get(model.brand_id) ?? 'Unknown Brand',
        name: model.name,
        phonePlatform: model.phone_platform!,
        colors: spec?.colors ?? [],
        storageOptionsGb: spec?.storage_options_gb ?? [],
        imeiCount: spec?.imei_count === 1 ? 1 : 2,
      }
    })

  const allowedStaffIds = new Set(rolesResult.data.map((role) => role.user_id))
  const staff = profilesResult.data
    .filter((profile) => allowedStaffIds.has(profile.id))
    .map((profile) => ({ id: profile.id, fullName: profile.full_name }))

  return {
    brands: brands.map((brand) => ({ id: brand.id, name: brand.name })),
    models,
    staff,
  }
}

export async function upsertPhoneModelWithSpecs(
  input: NewPhoneModelInput,
): Promise<string> {
  const client = requireSupabase()
  const name = input.name.trim()
  if (!name) throw new Error('Model name is required.')
  if (input.colors.length === 0) throw new Error('Add at least one color for this model.')
  if (input.storageOptionsGb.length === 0) {
    throw new Error('Add at least one storage option for this model.')
  }

  const { data, error } = await client.rpc('upsert_phone_model_with_specs', {
    p_brand_id: input.brandId,
    p_name: name,
    p_phone_platform: input.phonePlatform,
    p_colors: input.colors,
    p_storage_options_gb: input.storageOptionsGb,
    p_imei_count: input.imeiCount,
  })

  if (error) throw new Error(error.message || 'Failed to save phone model.')
  return data
}

export async function createPhonePurchase(
  draft: PhonePurchaseDraft,
  masterData: PhonePurchaseMasterData,
  photoFilesByItem: PhonePurchasePhotoMap,
  currentUserId: string,
): Promise<CreatedPhonePurchase> {
  const client = requireSupabase()

  if (!draft.checkedByUserId) throw new Error('Checked By is required.')
  if (!draft.purchasedByUserId) throw new Error('Purchased By is required.')
  if (draft.items.length === 0) throw new Error('Add at least one phone.')

  for (const [index, item] of draft.items.entries()) {
    const photoCount = photoFilesByItem[item.localId]?.length ?? 0
    if (photoCount > 6) throw new Error(`Device ${index + 1}: Maximum 6 photos allowed.`)
  }

  const modelById = new Map(masterData.models.map((model) => [model.id, model]))
  const identifiers = new Set<string>()

  const items = draft.items.map((item, index) => {
    const rowNumber = index + 1
    if (!item.productModelId) throw new Error(`Device ${rowNumber}: Model is required.`)

    const model = modelById.get(item.productModelId)
    if (!model) throw new Error(`Device ${rowNumber}: Invalid phone model.`)

    const imei1 = item.imei1.trim()
    const imei2 = model.imeiCount === 2 ? optionalText(item.imei2) : null
    if (!/^\d{15}$/.test(imei1)) {
      throw new Error(`Device ${rowNumber}: IMEI 1 must be exactly 15 digits.`)
    }
    if (imei2 && !/^\d{15}$/.test(imei2)) {
      throw new Error(`Device ${rowNumber}: IMEI 2 must be exactly 15 digits.`)
    }

    const normalizedImei1 = normalizeIdentifier(imei1)
    if (identifiers.has(normalizedImei1)) {
      throw new Error(
        `Device ${rowNumber}: IMEI ${imei1} is duplicated in this purchase.`,
      )
    }
    identifiers.add(normalizedImei1)

    if (imei2) {
      const normalizedImei2 = normalizeIdentifier(imei2)
      if (!normalizedImei2) throw new Error(`Device ${rowNumber}: IMEI 2 is invalid.`)
      if (normalizedImei1 === normalizedImei2) {
        throw new Error(`Device ${rowNumber}: IMEI 1 and IMEI 2 cannot be the same.`)
      }
      if (identifiers.has(normalizedImei2)) {
        throw new Error(
          `Device ${rowNumber}: IMEI ${imei2} is duplicated in this purchase.`,
        )
      }
      identifiers.add(normalizedImei2)
    }

    const isAppleDevice =
      model.phonePlatform === 'iphone' || model.name.toLowerCase().startsWith('ipad')
    const isIPhone = model.name.toLowerCase().startsWith('iphone')
    const isUsedIPhone = isIPhone && draft.deviceState === 'used'
    const purchasePrice = requiredNumber(
      item.purchasePriceMmk,
      `Device ${rowNumber}: Purchase Price`,
    )
    const salePrice = requiredNumber(item.salePriceMmk, `Device ${rowNumber}: Sale Price`)

    if (purchasePrice < 0)
      throw new Error(`Device ${rowNumber}: Purchase Price cannot be negative.`)
    if (salePrice < 0)
      throw new Error(`Device ${rowNumber}: Sale Price cannot be negative.`)

    const storageCapacity = optionalNumber(item.storageCapacityGb)
    const ram = isAppleDevice ? null : optionalNumber(item.ramGb)
    const batteryHealth = isUsedIPhone ? optionalNumber(item.batteryHealthPercent) : null

    if (batteryHealth !== null && (batteryHealth < 0 || batteryHealth > 100)) {
      throw new Error(`Device ${rowNumber}: Battery Health must be between 0 and 100%.`)
    }

    if (storageCapacity !== null && storageCapacity <= 0) {
      throw new Error(`Device ${rowNumber}: Storage Capacity must be greater than 0.`)
    }
    if (ram !== null && ram <= 0) {
      throw new Error(`Device ${rowNumber}: RAM must be greater than 0.`)
    }

    if (model.colors.length > 0 && !model.colors.includes(item.color)) {
      throw new Error(`Device ${rowNumber}: Choose a valid color for ${model.name}.`)
    }
    if (
      model.storageOptionsGb.length > 0 &&
      (storageCapacity === null || !model.storageOptionsGb.includes(storageCapacity))
    ) {
      throw new Error(
        `Device ${rowNumber}: Choose a valid storage option for ${model.name}.`,
      )
    }

    return {
      product_model_id: item.productModelId,
      purchase_price_mmk: purchasePrice,
      sale_price_mmk: salePrice,
      color: optionalText(item.color),
      ram_gb: ram,
      storage_type: null,
      storage_capacity_gb: storageCapacity,
      imei_1: imei1,
      imei_2: imei2,
      iphone_region_code: isAppleDevice
        ? optionalText((item.iphoneRegionCode ?? '').toUpperCase())
        : null,
      battery_health_percent: batteryHealth,
      battery_cycle_count: null,
      important_message_type: null,
      important_message_other: null,
      internal_notes: optionalText(item.internalNotes),
    }
  })

  let sellerContactId = draft.sellerContactId || null
  if (draft.sellerName.trim() && draft.sellerPhone.trim()) {
    const { data: resolvedSupplierId, error: supplierError } = await client.rpc(
      'resolve_purchase_supplier',
      {
        p_full_name: draft.sellerName.trim(),
        p_phone: draft.sellerPhone.trim(),
      },
    )
    if (supplierError)
      throw new Error(supplierError.message || 'Could not save supplier.')
    sellerContactId = String(resolvedSupplierId)
  }

  const { pathsByItem, allPaths } = await uploadPurchasePhotos(
    currentUserId,
    photoFilesByItem,
  )
  const itemsWithPhotos = items.map((item, index) => ({
    ...item,
    photo_paths: pathsByItem[draft.items[index].localId] ?? [],
  }))

  const { data, error } = await client.rpc('create_purchase_with_devices_and_photos', {
    p_purchase: {
      category: 'phone',
      device_state: draft.deviceState,
      purchase_date: draft.purchaseDate,
      seller_contact_id: sellerContactId,
      seller_name: optionalText(draft.sellerName),
      seller_phone: optionalText(draft.sellerPhone),
      // Always attribute the purchase to the authenticated account
      // that is performing this action.
      checked_by_user_id: currentUserId,
      purchased_by_user_id: currentUserId,
      notes: optionalText(draft.notes),
    },
    p_items: itemsWithPhotos,
  })

  if (error) {
    await cleanupUploadedPhotos(allPaths)
    console.error('Failed to create phone purchase:', error)
    throw new Error(getPurchaseErrorMessage(error))
  }

  const { data: purchase, error: purchaseError } = await client
    .from('purchases')
    .select('purchase_number')
    .eq('id', data)
    .single()

  if (purchaseError) {
    console.error(
      'Purchase saved but purchase number could not be loaded:',
      purchaseError,
    )
    return { id: data, purchaseNumber: data }
  }

  return { id: data, purchaseNumber: purchase.purchase_number }
}

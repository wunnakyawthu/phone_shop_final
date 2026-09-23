import { supabase } from '../../lib/supabase/client'
import type { PhoneInventoryItem } from './phoneInventoryTypes'
import { getDevicePhotoUrl } from '../purchases/devicePhotoUpload'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function loadPhoneInventory(): Promise<PhoneInventoryItem[]> {
  const client = requireSupabase()

  const { data: devices, error: devicesError } = await client
    .from('device_units')
    .select(
      'id, product_model_id, device_state, status, color, storage_capacity_gb, ram_gb, imei_1, imei_2, iphone_region_code, battery_health_percent, sale_price_mmk, internal_notes, is_publicly_visible, created_at',
    )
    .eq('category', 'phone')
    .neq('status', 'voided')
    .order('created_at', { ascending: false })

  if (devicesError) throw devicesError
  if (devices.length === 0) return []

  const modelIds = [...new Set(devices.map((device) => device.product_model_id))]
  const deviceIds = devices.map((device) => device.id)

  const [modelsResult, purchaseItemsResult, photosResult] = await Promise.all([
    client
      .from('product_models')
      .select('id, name, brand_id, phone_platform')
      .in('id', modelIds),
    client
      .from('purchase_items')
      .select('device_unit_id, purchase_id, purchase_price_mmk')
      .in('device_unit_id', deviceIds),
    client
      .from('device_photos')
      .select('id, device_unit_id, storage_path, sort_order')
      .in('device_unit_id', deviceIds)
      .order('sort_order'),
  ])

  if (modelsResult.error) throw modelsResult.error
  if (purchaseItemsResult.error) throw purchaseItemsResult.error
  if (photosResult.error) throw photosResult.error

  const brandIds = [...new Set(modelsResult.data.map((model) => model.brand_id))]
  const purchaseIds = [
    ...new Set(purchaseItemsResult.data.map((item) => item.purchase_id)),
  ]

  let brandsData: Array<{ id: string; name: string }> = []
  if (brandIds.length) {
    const { data, error } = await client
      .from('brands')
      .select('id, name')
      .in('id', brandIds)
    if (error) throw error
    brandsData = data
  }

  let purchasesData: Array<{
    id: string
    purchase_number: string
    purchase_date: string
    seller_name_snapshot: string | null
    seller_phone_snapshot: string | null
    notes: string | null
    purchased_by_user_id: string
  }> = []
  if (purchaseIds.length) {
    const { data, error } = await client
      .from('purchases')
      .select(
        'id, purchase_number, purchase_date, seller_name_snapshot, seller_phone_snapshot, notes, purchased_by_user_id',
      )
      .in('id', purchaseIds)
    if (error) throw error
    purchasesData = data
  }

  const purchaserIds = [
    ...new Set(
      purchasesData.map((purchase) => purchase.purchased_by_user_id).filter(Boolean),
    ),
  ]
  let purchaserProfiles: Array<{ id: string; full_name: string }> = []
  if (purchaserIds.length) {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name')
      .in('id', purchaserIds)
    if (error) throw error
    purchaserProfiles = data
  }

  const brandById = new Map(brandsData.map((brand) => [brand.id, brand.name] as const))
  const purchaserNameById = new Map(
    purchaserProfiles.map((profile) => [profile.id, profile.full_name] as const),
  )
  const modelById = new Map(modelsResult.data.map((model) => [model.id, model]))
  const purchaseItemByDeviceId = new Map(
    purchaseItemsResult.data.map((item) => [item.device_unit_id, item]),
  )
  const purchaseById = new Map(
    purchasesData.map((purchase) => [purchase.id, purchase] as const),
  )
  const photosByDevice = new Map<
    string,
    Array<{ id: string; path: string; url: string; sortOrder: number }>
  >()
  for (const photo of photosResult.data) {
    const photos = photosByDevice.get(photo.device_unit_id) ?? []
    photos.push({
      id: photo.id,
      path: photo.storage_path,
      url: getDevicePhotoUrl(photo.storage_path),
      sortOrder: photo.sort_order,
    })
    photosByDevice.set(photo.device_unit_id, photos)
  }

  return devices.map((device) => {
    const model = modelById.get(device.product_model_id)
    const purchaseItem = purchaseItemByDeviceId.get(device.id)
    const purchase = purchaseItem ? purchaseById.get(purchaseItem.purchase_id) : undefined

    return {
      id: device.id,
      modelId: device.product_model_id,
      brandId: model?.brand_id ?? '',
      modelName: model?.name ?? 'Unknown model',
      brandName: model
        ? (brandById.get(model.brand_id) ?? 'Unknown brand')
        : 'Unknown brand',
      phonePlatform: model?.phone_platform ?? 'other',
      deviceState: device.device_state,
      status: device.status,
      color: device.color,
      storageCapacityGb: device.storage_capacity_gb,
      ramGb: device.ram_gb,
      imei1: device.imei_1,
      imei2: device.imei_2,
      iphoneRegionCode: device.iphone_region_code,
      batteryHealthPercent: device.battery_health_percent,
      salePriceMmk: device.sale_price_mmk,
      purchasePriceMmk: purchaseItem?.purchase_price_mmk ?? null,
      purchaseNumber: purchase?.purchase_number ?? null,
      purchaseDate: purchase?.purchase_date ?? null,
      purchaseNotes: purchase?.notes ?? null,
      purchasedByUserId: purchase?.purchased_by_user_id ?? null,
      purchasedByName: purchase?.purchased_by_user_id
        ? (purchaserNameById.get(purchase.purchased_by_user_id) ?? null)
        : null,
      sellerName: purchase?.seller_name_snapshot ?? null,
      sellerPhone: purchase?.seller_phone_snapshot ?? null,
      internalNotes: device.internal_notes,
      photos: photosByDevice.get(device.id) ?? [],
      photoUrls: (photosByDevice.get(device.id) ?? []).map((photo) => photo.url),
      photoPaths: (photosByDevice.get(device.id) ?? []).map((photo) => photo.path),
      isPubliclyVisible: device.is_publicly_visible,
      createdAt: device.created_at,
    }
  })
}

export async function loadPhoneInventoryItem(
  id: string,
): Promise<PhoneInventoryItem | null> {
  const inventory = await loadPhoneInventory()
  return inventory.find((item) => item.id === id) ?? null
}

export interface UpdatePhoneInventoryInput {
  deviceState: 'new' | 'used'
  purchaseDate: string
  sellerName: string | null
  sellerPhone: string | null
  purchaseNotes: string | null
  productModelId: string
  color: string
  storageCapacityGb: number | null
  ramGb: number | null
  imei1: string
  imei2: string | null
  iphoneRegionCode: string | null
  batteryHealthPercent: number | null
  internalNotes: string | null
  salePriceMmk: number
  purchasePriceMmk: number | null
  isPubliclyVisible: boolean
  photoPaths: string[]
}

export async function updatePhoneInventoryItem(
  deviceId: string,
  input: UpdatePhoneInventoryInput,
) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_phone_inventory_device', {
    p_device_id: deviceId,
    p_patch: {
      device_state: input.deviceState,
      purchase_date: input.purchaseDate,
      seller_name: input.sellerName,
      seller_phone: input.sellerPhone,
      purchase_notes: input.purchaseNotes,
      product_model_id: input.productModelId,
      color: input.color || null,
      storage_capacity_gb: input.storageCapacityGb,
      ram_gb: input.ramGb,
      imei_1: input.imei1,
      imei_2: input.imei2,
      iphone_region_code: input.iphoneRegionCode,
      battery_health_percent: input.batteryHealthPercent,
      internal_notes: input.internalNotes,
      sale_price_mmk: input.salePriceMmk,
      purchase_price_mmk: input.purchasePriceMmk,
      is_publicly_visible: input.isPubliclyVisible,
    },
    p_photo_paths: input.photoPaths,
  })

  if (error) throw new Error(error.message || 'Failed to update phone.')
}

export async function deletePhoneInventoryItem(deviceId: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('delete_phone_inventory_device', {
    p_device_id: deviceId,
  })
  if (error) throw new Error(error.message || 'Failed to delete phone.')
}

export async function loadDeletedPhoneInventory() {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_deleted_phone_inventory')
  if (error) throw new Error(error.message || 'Failed to load Delete History.')

  return (data ?? []).map((row) => {
    const photoPaths = Array.isArray(row.photo_paths)
      ? row.photo_paths.filter((value): value is string => typeof value === 'string')
      : []

    return {
      historyId: row.history_id,
      deviceId: row.device_id,
      brandName: row.brand_name,
      modelName: row.model_name,
      identifier: row.identifier,
      deletedByName: row.deleted_by_name,
      deletedAt: row.deleted_at,
      photoPaths,
      photoUrls: photoPaths.map(getDevicePhotoUrl),
    }
  })
}

export async function restoreDeletedPhoneInventoryItem(historyId: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('restore_deleted_phone_inventory_item', {
    p_history_id: historyId,
  })
  if (error) throw new Error(error.message || 'Failed to restore phone to inventory.')
}

export async function permanentlyDeletePhoneInventoryItem(historyId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('permanently_delete_phone_inventory_item', {
    p_history_id: historyId,
  })
  if (error) throw new Error(error.message || 'Failed to permanently delete phone.')
  return data ?? []
}

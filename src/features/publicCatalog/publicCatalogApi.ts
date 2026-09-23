import type { Database, Json } from '../../types/database.generated'

import { supabase } from '../../lib/supabase/client'

import { getDevicePhotoUrl } from '../purchases/devicePhotoUpload'

import { getComputerPhotoUrl } from '../computers/purchases/computerPhotoUpload'

type Category = Database['public']['Enums']['product_category']

type DeviceState = Database['public']['Enums']['device_state']

type DeviceCondition = Database['public']['Enums']['device_condition']

type PublicComputerListRow =
  Database['public']['Functions']['get_public_computer_catalog']['Returns'][number]

type PublicComputerDetailRow =
  Database['public']['Functions']['get_public_computer_device']['Returns'][number]

export interface PublicCatalogDevice {
  publicId: string

  category: Category

  deviceState: DeviceState

  brandName: string

  modelName: string

  publicTitle: string

  color: string | null

  ramGb: number | null

  storageType: string | null

  storageCapacityGb: number | null

  cpuProcessor: string | null

  gpuGraphics: string | null

  screenSizeInches: number | null

  condition: DeviceCondition | null

  batteryHealthPercent: number | null

  iphoneRegionCode: string | null

  salePriceMmk: number

  photoUrls: string[]

  ramText: string | null

  primaryStorageText: string | null

  secondaryStorageText: string | null

  screenSizeText: string | null

  conditionText: string | null

  internalNotes: string | null
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  return supabase
}

function parsePhotoPaths(value: Json): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const path = item.path

      return typeof path === 'string' ? path : null
    })
    .filter((path): path is string => Boolean(path))
}

function buildStorageText(size: string | null, type: string | null) {
  const parts = [size, type].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : null
}

function conditionToDeviceState(condition: string | null): DeviceState {
  return condition === 'used' ? ('used' as DeviceState) : ('new' as DeviceState)
}

function mapPhoneDevice(
  row: Database['public']['Functions']['get_public_catalog_devices']['Returns'][number],
): PublicCatalogDevice {
  const paths = parsePhotoPaths(row.photo_paths)

  return {
    publicId: row.public_id,

    category: row.category,

    deviceState: row.device_state,

    brandName: row.brand_name,

    modelName: row.model_name,

    publicTitle: row.public_title,

    color: row.color,

    ramGb: row.ram_gb,

    storageType: row.storage_type,

    storageCapacityGb: row.storage_capacity_gb,

    cpuProcessor: row.cpu_processor,

    gpuGraphics: row.gpu_graphics,

    screenSizeInches: row.screen_size_inches,

    condition: row.condition,

    batteryHealthPercent: row.battery_health_percent,

    iphoneRegionCode: row.iphone_region_code,

    salePriceMmk: row.sale_price_mmk,

    photoUrls: paths.map(getDevicePhotoUrl),

    ramText: row.ram_gb !== null ? `${row.ram_gb} GB` : null,

    primaryStorageText:
      row.storage_capacity_gb !== null
        ? `${row.storage_capacity_gb} GB${row.storage_type ? ` ${row.storage_type}` : ''}`
        : null,

    secondaryStorageText: null,

    screenSizeText: row.screen_size_inches !== null ? `${row.screen_size_inches}"` : null,

    conditionText: row.condition,

    internalNotes: (row as any).internal_notes ?? null,
  }
}

function mapComputerListDevice(row: PublicComputerListRow): PublicCatalogDevice {
  return {
    publicId: row.id,

    category: 'computer' as Category,

    deviceState: conditionToDeviceState(row.condition),

    brandName: row.brand_name ?? '',

    modelName: row.model_name ?? '',

    publicTitle: [row.brand_name, row.model_name].filter(Boolean).join(' '),

    color: row.color ?? null,

    ramGb: null,

    storageType: row.primary_storage_type ?? null,

    storageCapacityGb: null,

    cpuProcessor: row.cpu ?? null,

    gpuGraphics: row.gpu ?? null,

    screenSizeInches: null,

    condition: row.condition as DeviceCondition,

    batteryHealthPercent: null,

    iphoneRegionCode: null,

    salePriceMmk: Number(row.sale_price ?? 0),

    photoUrls: row.photo_path ? [getComputerPhotoUrl(row.photo_path)] : [],

    ramText: row.ram ?? null,

    primaryStorageText: buildStorageText(
      row.primary_storage_size,
      row.primary_storage_type,
    ),

    secondaryStorageText: null,

    screenSizeText: row.screen_size ?? null,

    conditionText: row.condition ?? null,

    internalNotes: (row as any).internal_notes ?? null,
  }
}

function mapComputerDetailDevice(row: PublicComputerDetailRow): PublicCatalogDevice {
  const photoPaths = parsePhotoPaths(row.photo_paths ?? [])

  return {
    publicId: row.id,

    category: 'computer' as Category,

    deviceState: conditionToDeviceState(row.condition),

    brandName: row.brand_name ?? '',

    modelName: row.model_name ?? '',

    publicTitle: [row.brand_name, row.model_name].filter(Boolean).join(' '),

    color: row.color ?? null,

    ramGb: null,

    storageType: row.primary_storage_type ?? null,

    storageCapacityGb: null,

    cpuProcessor: row.cpu ?? null,

    gpuGraphics: row.gpu ?? null,

    screenSizeInches: null,

    condition: row.condition as DeviceCondition,

    batteryHealthPercent: null,

    iphoneRegionCode: null,

    salePriceMmk: Number(row.sale_price ?? 0),

    photoUrls: photoPaths.map(getComputerPhotoUrl),

    ramText: row.ram ?? null,

    primaryStorageText: buildStorageText(
      row.primary_storage_size,
      row.primary_storage_type,
    ),

    secondaryStorageText: buildStorageText(
      row.secondary_storage_size,
      row.secondary_storage_type,
    ),

    screenSizeText: row.screen_size ?? null,

    conditionText: row.condition ?? null,

    internalNotes: (row as any).internal_notes ?? null,
  }
}

export async function loadPublicCatalog(
  category?: Category,
  search?: string,
  deviceState?: DeviceState,
): Promise<PublicCatalogDevice[]> {
  const client = requireSupabase()

  if (category === 'computer') {
    const { data, error } = await client.rpc('get_public_computer_catalog')

    if (error) {
      throw error
    }

    return (data ?? []).map(mapComputerListDevice)
  }

  const { data, error } = await client.rpc('get_public_catalog_devices', {
    p_category: category,

    p_search: search?.trim() || undefined,

    p_device_state: deviceState,
  })

  if (error) {
    throw error
  }

  return data.map(mapPhoneDevice)
}

export async function loadPublicDevice(
  publicId: string,
): Promise<PublicCatalogDevice | null> {
  const client = requireSupabase()

  // Computer first
  const { data: computerData, error: computerError } = await client.rpc(
    'get_public_computer_device',
    {
      p_public_id: publicId,
    },
  )

  if (computerError) {
    throw computerError
  }

  if (computerData && computerData.length > 0) {
    return mapComputerDetailDevice(computerData[0])
  }

  // Phone fallback
  const { data, error } = await client.rpc('get_public_catalog_device', {
    p_public_id: publicId,
  })

  if (error) {
    throw error
  }

  const row = data[0]

  if (!row) {
    return null
  }

  return mapPhoneDevice(row)
}

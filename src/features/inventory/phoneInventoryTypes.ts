import type { Database } from '../../types/database.generated'

export type InventoryStatus = Database['public']['Enums']['inventory_status']
export type DeviceState = Database['public']['Enums']['device_state']

export interface PhoneInventoryPhoto {
  id: string
  path: string
  url: string
  sortOrder: number
}

export interface PhoneInventoryItem {
  id: string
  modelId: string
  brandId: string
  modelName: string
  brandName: string
  phonePlatform: string
  deviceState: DeviceState
  status: InventoryStatus
  color: string | null
  storageCapacityGb: number | null
  ramGb: number | null
  imei1: string | null
  imei2: string | null
  iphoneRegionCode: string | null
  batteryHealthPercent: number | null
  salePriceMmk: number
  purchasePriceMmk: number | null
  purchaseNumber: string | null
  purchaseDate: string | null
  purchaseNotes: string | null
  purchasedByUserId: string | null
  purchasedByName: string | null
  sellerName: string | null
  sellerPhone: string | null
  internalNotes: string | null
  photos: PhoneInventoryPhoto[]
  photoUrls: string[]
  photoPaths: string[]
  isPubliclyVisible: boolean
  createdAt: string
}

export interface DeletedPhoneInventoryItem {
  historyId: string
  deviceId: string
  brandName: string
  modelName: string
  identifier: string | null
  deletedByName: string | null
  deletedAt: string
  photoPaths: string[]
  photoUrls: string[]
}

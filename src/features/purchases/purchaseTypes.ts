import { createClientId } from '../../lib/id'
import type { Database } from '../../types/database.generated'

export type PhoneDeviceState = Database['public']['Enums']['device_state']
export type PhonePlatform = Database['public']['Enums']['phone_platform']

export interface BrandOption {
  id: string
  name: string
}

export interface ProductModelOption {
  id: string
  brandId: string
  brandName: string
  name: string
  phonePlatform: PhonePlatform
  colors: string[]
  storageOptionsGb: number[]
  imeiCount: 1 | 2
}

export interface NewPhoneModelInput {
  brandId: string
  name: string
  phonePlatform: PhonePlatform
  colors: string[]
  storageOptionsGb: number[]
  imeiCount: 1 | 2
}

export interface StaffOption {
  id: string
  fullName: string
}

export interface PhonePurchaseItemDraft {
  localId: string
  productModelId: string
  brandId: string
  color: string
  storageType: string
  storageCapacityGb: string
  ramGb: string
  imei1: string
  imei2: string
  iphoneRegionCode: string
  purchasePriceMmk: string
  salePriceMmk: string
  batteryHealthPercent: string
  batteryCycleCount: string
  internalNotes: string
}

export interface PhonePurchaseDraft {
  deviceState: PhoneDeviceState
  sellerSourceType: 'seller' | 'supplier'
  sellerContactId: string
  sellerName: string
  sellerPhone: string
  checkedByUserId: string
  purchasedByUserId: string
  purchaseDate: string
  notes: string
  items: PhonePurchaseItemDraft[]
}

export interface PhonePurchaseMasterData {
  brands: BrandOption[]
  models: ProductModelOption[]
  staff: StaffOption[]
}

export interface CreatedPhonePurchase {
  id: string
  purchaseNumber: string
}

export function createEmptyPhonePurchaseItem(): PhonePurchaseItemDraft {
  return {
    localId: createClientId(),
    productModelId: '',
    brandId: '',
    color: '',
    storageType: '',
    storageCapacityGb: '',
    ramGb: '',
    imei1: '',
    imei2: '',
    iphoneRegionCode: '',
    purchasePriceMmk: '',
    salePriceMmk: '',
    batteryHealthPercent: '',
    batteryCycleCount: '',
    internalNotes: '',
  }
}

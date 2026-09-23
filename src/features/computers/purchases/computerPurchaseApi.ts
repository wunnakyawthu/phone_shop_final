import { supabase } from '../../../lib/supabase/client'
import {
  cleanupComputerPhotos,
  uploadComputerPurchasePhotos,
} from './computerPhotoUpload'

export type ComputerPurchasePayload = {
  computerType: string
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
  condition: string
  purchaseFrom: string
  sellerPhone: string
  purchaseNotes: string
  purchaseDate: string
  purchasePrice: number
  salePrice: number
  internalNotes: string
}

function mapComputerType(value: string) {
  if (value === 'Laptop') return 'windows_laptop'
  if (value === 'Desktop PC') return 'desktop_system_unit'
  if (value === 'All-in-One') return 'all_in_one'
  return 'macbook'
}

function mapCondition(value: string) {
  return value === 'New' ? 'new' : 'used'
}

export async function createComputerPurchase(
  payload: ComputerPurchasePayload,
  files: File[] = [],
) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const client = supabase

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    throw new Error('You must be signed in to save a computer purchase.')
  }

  let uploadedPaths: string[] = []

  try {
    if (files.length > 0) {
      uploadedPaths = await uploadComputerPurchasePhotos(user.id, files)
    }

    const { data, error } = await client.rpc('create_computer_inventory_with_photos', {
      p_computer_type: mapComputerType(payload.computerType),
      p_brand: payload.brand,
      p_model_name: payload.model,
      p_cpu: payload.cpu,
      p_ram: payload.ram,
      p_primary_storage_type: payload.primaryStorageType,
      p_primary_storage_size: payload.primaryStorageSize,
      p_secondary_storage_type: payload.secondaryStorageType,
      p_secondary_storage_size: payload.secondaryStorageSize,
      p_gpu: payload.gpu,
      p_screen_size: payload.screenSize,
      p_color: payload.color,
      p_serial_number: payload.serialNumber,
      p_condition: mapCondition(payload.condition),
      p_purchase_from: payload.purchaseFrom,
      p_seller_phone: payload.sellerPhone,
      p_purchase_notes: payload.purchaseNotes,
      p_purchase_date: payload.purchaseDate,
      p_purchase_price: payload.purchasePrice,
      p_sale_price: payload.salePrice,
      p_internal_notes: payload.internalNotes,
      p_photo_paths: uploadedPaths,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    if (uploadedPaths.length > 0) {
      try {
        await cleanupComputerPhotos(uploadedPaths)
      } catch (cleanupError) {
        console.error('Failed to clean up computer purchase photos:', cleanupError)
      }
    }

    throw error
  }
}

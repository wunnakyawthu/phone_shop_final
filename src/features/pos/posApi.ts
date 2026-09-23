import { supabase } from '../../lib/supabase/client'
import { loadPhoneInventory } from '../inventory/phoneInventoryApi'
import { getComputerPhotoUrl } from '../computers/purchases/computerPhotoUpload'

export type PosCategory = 'phone' | 'computer'
export type PosInventoryItem = {
  id: string
  name: string
  serial: string | null
  price: number
  photoUrl: string | null
  detail: string
}
export type PosCartItem = PosInventoryItem & { discountMmk: number }
export type ReceiptSettings = {
  storeName: string
  phone: string
  address: string
  receiptFooter: string
  warrantyTerms: string
}
export type CustomerSale = {
  id: string
  invoice_number: string
  sale_date: string
  net_total_mmk: number
  pos_sale_items: Array<{ product_name_snapshot: string }>
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase as any
}

export async function loadPosInventory(
  category: PosCategory,
): Promise<PosInventoryItem[]> {
  if (category === 'phone') {
    const items = await loadPhoneInventory()
    return items
      .filter((item) => item.status === 'in_stock')
      .map((item) => ({
        id: item.id,
        name: `${item.brandName} ${item.modelName}`,
        serial: item.imei1,
        price: item.salePriceMmk,
        photoUrl: item.photoUrls[0] ?? null,
        detail: [
          item.storageCapacityGb ? `${item.storageCapacityGb} GB` : null,
          item.color,
        ]
          .filter(Boolean)
          .join(' · '),
      }))
  }

  const { data, error } = await client()
    .from('computer_inventory_items')
    .select(
      'id,brand,model_name,serial_number,sale_price,ram,primary_storage_size,computer_inventory_photos(storage_path,sort_order)',
    )
    .eq('status', 'in_stock')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((item: any) => {
    const photos = [...(item.computer_inventory_photos ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    )
    return {
      id: item.id,
      name: `${item.brand ?? ''} ${item.model_name ?? 'Computer'}`.trim(),
      serial: item.serial_number,
      price: Number(item.sale_price ?? 0),
      photoUrl: photos[0]?.storage_path
        ? getComputerPhotoUrl(photos[0].storage_path)
        : null,
      detail: [item.ram, item.primary_storage_size].filter(Boolean).join(' · '),
    }
  })
}

export async function loadReceiptSettings(): Promise<ReceiptSettings> {
  const { data, error } = await client()
    .rpc('get_pos_store_settings')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Store receipt settings are not configured.')
  return {
    storeName: data.store_name,
    phone: data.phone ?? '',
    address: data.address ?? '',
    receiptFooter: data.receipt_footer ?? 'Thank you for your purchase.',
    warrantyTerms: data.warranty_terms ?? '',
  }
}

export async function loadCustomerHistory(phone: string): Promise<CustomerSale[]> {
  if (!phone.trim()) return []
  const { data, error } = await client()
    .from('pos_sales')
    .select(
      'id,invoice_number,sale_date,net_total_mmk,pos_sale_items(product_name_snapshot)',
    )
    .eq('customer_phone_snapshot', phone.trim())
    .is('voided_at', null)
    .order('sale_date', { ascending: false })
    .limit(10)
  if (error) throw error
  return data ?? []
}

export async function cancelPosSale(saleId: string, reason: string) {
  const { error } = await client().rpc('cancel_pos_sale', {
    p_sale_id: saleId,
    p_reason: reason.trim() || 'Sale entered by mistake',
  })
  if (error) throw error
}

export async function createPosSale(input: {
  category: PosCategory
  customerName: string
  customerPhone: string
  paymentMethod: string
  notes: string
  warrantyTerms: string
  warrantyDurationDays: number
  items: PosCartItem[]
}) {
  const { data: saleId, error } = await client().rpc('create_pos_sale_v3', {
    p_category: input.category,
    p_sale: {
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      payment_method: input.paymentMethod,
      notes: input.notes,
      warranty_terms: input.warrantyTerms,
      warranty_duration_days: input.warrantyDurationDays,
    },
    p_items: input.items.map((item) => ({
      inventory_id: item.id,
      unit_price_mmk: item.price,
      discount_mmk: item.discountMmk,
    })),
  })
  if (error) throw error
  const { data, error: loadError } = await client()
    .from('pos_sales')
    .select('*,pos_sale_items(*)')
    .eq('id', saleId)
    .single()
  if (loadError) throw loadError
  return data
}

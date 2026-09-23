import { supabase } from '../../lib/supabase/client'

const db = () => {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase as any
}
export type ReportPeriod = 'daily' | 'weekly' | 'monthly'
const calendarRange = (date: string, period: ReportPeriod) => {
  const [year, month, day] = date.split('-').map(Number)
  const start = new Date(year, month - 1, day, 12)
  if (period === 'weekly') start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  if (period === 'monthly') start.setDate(1)

  const end = new Date(start)
  if (period === 'daily') end.setDate(end.getDate() + 1)
  if (period === 'weekly') end.setDate(end.getDate() + 7)
  if (period === 'monthly') end.setMonth(end.getMonth() + 1)

  const dateKey = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const startDate = dateKey(start)
  const endDate = dateKey(end)
  const startTimestamp = new Date(`${startDate}T00:00:00`).toISOString()
  const endTimestamp = new Date(`${endDate}T00:00:00`).toISOString()
  return { startDate, endDate, startTimestamp, endTimestamp }
}

export async function loadDailyReport(date: string, period: ReportPeriod = 'daily') {
  const { startDate, endDate, startTimestamp, endTimestamp } = calendarRange(date, period)
  const [sales, phonePurchases, computerPurchases] = await Promise.all([
    db()
      .from('pos_sales')
      .select(
        'id,invoice_number,category,sale_date,customer_name_snapshot,customer_phone_snapshot,payment_method,subtotal_mmk,discount_total_mmk,net_total_mmk,pos_sale_items(product_name_snapshot,purchase_cost_snapshot_mmk,net_price_mmk)',
      )
      .gte('sale_date', startTimestamp)
      .lt('sale_date', endTimestamp)
      .is('voided_at', null)
      .order('sale_date', { ascending: false }),
    db()
      .from('purchases')
      .select(
        'id,purchase_number,purchase_date,device_state,seller_name_snapshot,seller_phone_snapshot,notes,purchase_items(id,purchase_price_mmk,device_units(id,imei_1,imei_2,color,ram_gb,storage_capacity_gb,sale_price_mmk,status,product_models(name,brands(name))))',
      )
      .gte('purchase_date', startTimestamp)
      .lt('purchase_date', endTimestamp)
      .eq('status', 'completed')
      .order('purchase_date', { ascending: false }),
    db()
      .from('computer_inventory_items')
      .select(
        'id,purchase_number,purchase_date,brand,model_name,purchase_price,purchase_from',
      )
      .gte('purchase_date', startDate)
      .lt('purchase_date', endDate)
      .eq('is_deleted', false)
      .order('purchase_date', { ascending: false }),
  ])
  if (sales.error) throw sales.error
  if (phonePurchases.error) throw phonePurchases.error
  if (computerPurchases.error) throw computerPurchases.error
  return {
    sales: sales.data ?? [],
    phonePurchases: phonePurchases.data ?? [],
    computerPurchases: computerPurchases.data ?? [],
  }
}

export async function loadWarrantyItems() {
  const { data, error } = await db()
    .from('pos_sale_items')
    .select(
      'id,product_name_snapshot,serial_snapshot,category_snapshot,purchase_date_snapshot,unit_price_mmk,discount_percent,discount_mmk,net_price_mmk,purchase_cost_snapshot_mmk,profit_snapshot_mmk,warranty_duration_days,warranty_started_at,warranty_expires_at,warranty_terms_snapshot,archived_at,purged_at,is_voided,pos_sales!inner(id,invoice_number,category,sale_date,customer_name_snapshot,customer_phone_snapshot,subtotal_mmk,discount_total_mmk,net_total_mmk,payment_method,notes,sold_by,sold_by_name_snapshot,voided_at,profiles!pos_sales_sold_by_fkey(full_name))',
    )
    .eq('is_voided', false)
    .is('pos_sales.voided_at', null)
    .order('warranty_expires_at', { ascending: true })
  if (error) throw error
  return data ?? []
}
export async function archiveWarrantyItem(id: string) {
  const { error } = await db().rpc('archive_expired_warranty_item', { p_item_id: id })
  if (error) throw error
}
export async function purgeWarrantyItem(id: string) {
  const { error } = await db().rpc('purge_archived_device_data', { p_item_id: id })
  if (error) throw error
}
export async function cancelVoucherAndRestoreStock(saleId: string, reason: string) {
  const { error } = await db().rpc('cancel_pos_sale', {
    p_sale_id: saleId,
    p_reason: reason.trim() || 'Sale entered by mistake',
  })
  if (error) throw error
}
export async function loadVoucherDetails(saleId: string) {
  const { data, error } = await db()
    .from('pos_sales')
    .select('*,profiles!pos_sales_sold_by_fkey(full_name),pos_sale_items(*)')
    .eq('id', saleId)
    .single()
  if (error) throw error
  return data
}

export async function loadPhonePurchaseDetails(purchaseId: string) {
  const { data, error } = await db()
    .from('purchases')
    .select(
      'id,purchase_number,purchase_date,device_state,status,seller_contact_id,seller_name_snapshot,seller_phone_snapshot,notes,purchase_items(id,purchase_price_mmk,notes,device_units(id,imei_1,imei_2,color,ram_gb,storage_capacity_gb,sale_price_mmk,status,internal_notes,product_models(name,brands(name))))',
    )
    .eq('id', purchaseId)
    .single()
  if (error) throw error
  return data
}

export async function loadComputerPurchaseDetails(purchaseId: string) {
  const { data, error } = await db()
    .from('computer_inventory_items')
    .select('*')
    .eq('id', purchaseId)
    .single()
  if (error) throw error
  return data
}

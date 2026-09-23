import { supabase } from '../../lib/supabase/client'

const db = () => {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase as any
}
export type DashboardStats = {
  phoneStock: number
  computerStock: number
  totalBought: number
  totalSold: number
  revenue: number
  capital: number
  profit: number
  todaySales: number
  activeWarranty: number
  recentSales: any[]
  trend: Array<{ label: string; sales: number; profit: number }>
}
export async function loadDashboardStats(): Promise<DashboardStats> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const trendStart = new Date(start)
  trendStart.setDate(trendStart.getDate() - 6)
  const [phones, computers, phoneBuys, computerBuys, sales, warranties] =
    await Promise.all([
      db()
        .from('device_units')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'phone')
        .eq('status', 'in_stock'),
      db()
        .from('computer_inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_stock')
        .eq('is_deleted', false),
      db().from('purchase_items').select('purchase_price_mmk,purchases!inner(status)'),
      db().from('computer_inventory_items').select('purchase_price').eq('is_deleted', false),
      db()
        .from('pos_sales')
        .select(
          'id,invoice_number,category,sale_date,net_total_mmk,customer_name_snapshot,pos_sale_items(product_name_snapshot,purchase_cost_snapshot_mmk)',
        )
        .gte('sale_date', trendStart.toISOString())
        .is('voided_at', null)
        .order('sale_date', { ascending: false }),
      db()
        .from('pos_sale_items')
        .select('id', { count: 'exact', head: true })
        .gt('warranty_expires_at', new Date().toISOString())
        .is('archived_at', null)
        .eq('is_voided', false),
    ])
  for (const result of [phones, computers, phoneBuys, computerBuys, sales, warranties])
    if (result.error) throw result.error
  const saleRows = sales.data ?? []
  const soldItems = saleRows.flatMap((s: any) => s.pos_sale_items ?? [])
  const revenue = saleRows.reduce((n: number, s: any) => n + Number(s.net_total_mmk), 0)
  const soldCost = soldItems.reduce(
    (n: number, i: any) => n + Number(i.purchase_cost_snapshot_mmk),
    0,
  )
  const capital =
    (phoneBuys.data ?? []).filter((i: any) => i.purchases?.status === 'completed').reduce(
      (n: number, i: any) => n + Number(i.purchase_price_mmk),
      0,
    ) +
    (computerBuys.data ?? []).reduce(
      (n: number, i: any) => n + Number(i.purchase_price),
      0,
    )
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(trendStart)
    day.setDate(day.getDate() + index)
    const key = day.toISOString().slice(0, 10)
    const rows = saleRows.filter((s: any) => s.sale_date.slice(0, 10) === key)
    const daySales = rows.reduce((n: number, s: any) => n + Number(s.net_total_mmk), 0)
    const dayCost = rows
      .flatMap((s: any) => s.pos_sale_items ?? [])
      .reduce((n: number, i: any) => n + Number(i.purchase_cost_snapshot_mmk), 0)
    return {
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      sales: daySales,
      profit: daySales - dayCost,
    }
  })
  return {
    phoneStock: phones.count ?? 0,
    computerStock: computers.count ?? 0,
    totalBought: (phoneBuys.data?.length ?? 0) + (computerBuys.data?.length ?? 0),
    totalSold: soldItems.length,
    revenue,
    capital,
    profit: revenue - soldCost,
    todaySales: saleRows
      .filter((s: any) => new Date(s.sale_date) >= start)
      .reduce((n: number, s: any) => n + Number(s.net_total_mmk), 0),
    activeWarranty: warranties.count ?? 0,
    recentSales: saleRows.slice(0, 5),
    trend,
  }
}

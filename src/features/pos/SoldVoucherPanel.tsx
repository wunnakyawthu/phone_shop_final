import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase/client'
import { cancelPosSale } from './posApi'
import { CancelVoucherDialog } from './CancelVoucherDialog'

const money = (value: number) =>
  `${new Intl.NumberFormat('en-US').format(Number(value))} MMK`
export function SoldVoucherPanel({
  category,
  inventoryId,
}: {
  category: 'phone' | 'computer'
  inventoryId: string
}) {
  const { t } = useTranslation()
  const [item, setItem] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  useEffect(() => {
    if (!supabase) return
    const client = supabase as any
    client
      .from('pos_sale_items')
      .select('*,pos_sales!inner(*,profiles!pos_sales_sold_by_fkey(full_name))')
      .eq(
        category === 'phone' ? 'device_unit_id' : 'computer_inventory_item_id',
        inventoryId,
      )
      .eq('is_voided', false)
      .is('pos_sales.voided_at', null)
      .maybeSingle()
      .then(({ data }: any) => setItem(data))
  }, [category, inventoryId])
  if (!item) return null
  const sale = item.pos_sales
  async function cancelSale(reason: string) {
    setBusy(true)
    setError(null)
    try {
      await cancelPosSale(sale.id, reason)
      setItem(null)
      setOpen(false)
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel voucher.')
      setBusy(false)
    }
  }
  return (
    <>
      <section className="premium-section mt-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              {t('voucher.soldItem')}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{sale.invoice_number}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {sale.customer_name_snapshot} ·{' '}
              {new Date(sale.sale_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            {t('voucher.open')}
          </button>
        </div>
      </section>
      {open && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {t('voucher.title')}
                </p>
                <h2 className="mt-1 text-2xl font-bold">{sale.invoice_number}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl"
              >
                ×
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
              <p>
                {t('voucher.customer')}: <b>{sale.customer_name_snapshot}</b>
              </p>
              <p className="mt-1">
                {t('voucher.phone')}: <b>{sale.customer_phone_snapshot || '—'}</b>
              </p>
              <p className="mt-1">
                {t('voucher.soldBy')}:{' '}<b>{sale.sold_by_name_snapshot || sale.profiles?.full_name || 'Staff'}</b>
              </p>
            </div>
            <div className="mt-5 border-y border-slate-200 py-4">
              <p className="font-semibold">{item.product_name_snapshot}</p>
              <p className="text-xs text-slate-500">
                {item.serial_snapshot || 'Identifier purged'}
              </p>
              <p className="mt-3 text-right text-lg font-bold">
                {money(item.net_price_mmk)}
              </p>
            </div>
            <div className="mt-4 flex justify-between text-xl font-bold">
              <span>{t('voucher.total')}</span>
              <span>{money(sale.net_total_mmk)}</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {t('voucher.warrantyExpires')} {new Date(item.warranty_expires_at).toLocaleDateString()}
            </p>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => setCancelOpen(true)}
              className="mt-5 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              {busy ? t('voucher.cancelling') : t('voucher.cancel')}
            </button>
          </div>
        </div>
      )}
      <CancelVoucherDialog
        open={cancelOpen}
        invoiceNumber={sale.invoice_number}
        busy={busy}
        error={error}
        onClose={() => {
          if (!busy) {
            setCancelOpen(false)
            setError(null)
          }
        }}
        onConfirm={(reason) => void cancelSale(reason)}
      />
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useTranslation } from 'react-i18next'
import { CancelVoucherDialog } from '../pos/CancelVoucherDialog'
import { PaginationBar } from '../../components/navigation/PaginationBar'
import {
  archiveWarrantyItem,
  cancelVoucherAndRestoreStock,
  loadComputerPurchaseDetails,
  loadDailyReport,
  loadPhonePurchaseDetails,
  loadVoucherDetails,
  loadWarrantyItems,
  purgeWarrantyItem,
  type ReportPeriod,
} from './reportsApi'

const money = (n: number) => `${new Intl.NumberFormat('en-US').format(Math.round(n))} MMK`
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ReportsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [tab, setTab] = useState<'daily' | 'warranty'>('daily')
  const [date, setDate] = useState(today())
  const [period, setPeriod] = useState<ReportPeriod>('daily')
  const [reportSearch, setReportSearch] = useState('')
  const [reportCategory, setReportCategory] = useState<'all' | 'phone' | 'computer'>(
    'all',
  )
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [warrantySearch, setWarrantySearch] = useState('')
  const [voucher, setVoucher] = useState<any | null>(null)
  const [reportDetail, setReportDetail] = useState<{
    kind: 'sale' | 'phonePurchase' | 'computerPurchase'
    record: any
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<any | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [warranties, setWarranties] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'daily') setData(await loadDailyReport(date, period))
      else setWarranties(await loadWarrantyItems())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports.')
    } finally {
      setLoading(false)
    }
  }, [date, period, tab])
  useEffect(() => {
    void refresh()
  }, [refresh])
  const totals = useMemo(() => {
    const sales = data?.sales ?? []
    const items = sales.flatMap((s: any) => s.pos_sale_items ?? [])
    const income = sales.reduce((x: number, s: any) => x + Number(s.net_total_mmk), 0)
    const soldCost = items.reduce(
      (x: number, i: any) => x + Number(i.purchase_cost_snapshot_mmk),
      0,
    )
    const phoneBuy = (data?.phonePurchases ?? [])
      .flatMap((p: any) => p.purchase_items ?? [])
      .reduce((x: number, i: any) => x + Number(i.purchase_price_mmk), 0)
    const computerBuy = (data?.computerPurchases ?? []).reduce(
      (x: number, i: any) => x + Number(i.purchase_price),
      0,
    )
    return {
      income,
      soldCost,
      profit: income - soldCost,
      purchaseCost: phoneBuy + computerBuy,
    }
  }, [data])
  const grouped = useMemo(() => {
    return {
      active: warranties.filter(
        (x) => !x.archived_at && new Date(x.warranty_expires_at).getTime() > now,
      ),
      expired: warranties.filter(
        (x) => !x.archived_at && new Date(x.warranty_expires_at).getTime() <= now,
      ),
      archived: warranties.filter((x) => x.archived_at),
    }
  }, [warranties, now])
  const filteredReport = useMemo(() => {
    const query = reportSearch.trim().toLowerCase()
    const includes = (...values: unknown[]) =>
      !query ||
      values.some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query),
      )
    const sales = (data?.sales ?? []).filter((sale: any) => {
      if (reportCategory !== 'all' && sale.category !== reportCategory) return false
      if (paymentFilter !== 'all' && sale.payment_method !== paymentFilter) return false
      return includes(
        sale.invoice_number,
        sale.customer_name_snapshot,
        sale.customer_phone_snapshot,
        ...(sale.pos_sale_items ?? []).map((item: any) => item.product_name_snapshot),
      )
    })
    const phonePurchases =
      reportCategory === 'computer'
        ? []
        : (data?.phonePurchases ?? []).filter((purchase: any) =>
            includes(purchase.purchase_number, purchase.seller_name_snapshot),
          )
    const computerPurchases =
      reportCategory === 'phone'
        ? []
        : (data?.computerPurchases ?? []).filter((purchase: any) =>
            includes(
              purchase.purchase_number,
              purchase.brand,
              purchase.model_name,
              purchase.purchase_from,
            ),
          )
    return { sales, phonePurchases, computerPurchases }
  }, [data, paymentFilter, reportCategory, reportSearch])
  const visibleWarranty = useMemo(() => {
    const query = warrantySearch.trim().toLowerCase()
    if (!query) return grouped
    const matches = (item: any) =>
      [
        item.product_name_snapshot,
        item.serial_snapshot,
        item.pos_sales.invoice_number,
        item.pos_sales.customer_name_snapshot,
        item.pos_sales.customer_phone_snapshot,
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query),
      )
    return {
      active: grouped.active.filter(matches),
      expired: grouped.expired.filter(matches),
      archived: grouped.archived.filter(matches),
    }
  }, [grouped, warrantySearch])
  async function archive(id: string) {
    try {
      await archiveWarrantyItem(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed.')
    }
  }
  async function purge(item: any) {
    if (
      !window.confirm(
        `Remove photos and non-essential device details for ${item.product_name_snapshot}? Voucher, IMEI/serial, dates, prices, profit, staff, customer and warranty snapshots will remain.`,
      )
    )
      return
    try {
      await purgeWarrantyItem(item.id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purge failed.')
    }
  }
  async function cancelVoucher(item: any, reason: string) {
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelVoucherAndRestoreStock(item.pos_sales.id, reason)
      setCancelTarget(null)
      setVoucher(null)
      await refresh()
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Cancellation failed.')
    } finally {
      setCancelling(false)
    }
  }
  async function openReportDetail(
    kind: 'sale' | 'phonePurchase' | 'computerPurchase',
    id: string,
  ) {
    setDetailLoading(true)
    setError(null)
    try {
      const record =
        kind === 'sale'
          ? await loadVoucherDetails(id)
          : kind === 'phonePurchase'
            ? await loadPhonePurchaseDetails(id)
            : await loadComputerPurchaseDetails(id)
      setReportDetail({ kind, record })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not open record details.',
      )
    } finally {
      setDetailLoading(false)
    }
  }
  return (
    <section className="pb-10">
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">{t('reports.overview')}</p>
          <h1 className="management-title">{t('reports.title')}</h1>
          <p className="management-subtitle">{t('reports.subtitle')}</p>
        </div>
        <div className="flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1">
          {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((value) => (
            <button
              key={value}
              onClick={() => {
                setPeriod(value)
                setTab('daily')
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'daily' && period === value ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
              {t(`reports.${value}`)}
            </button>
          ))}
          <button
            onClick={() => setTab('warranty')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'warranty' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          >
            {t('reports.warranty')}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="mt-6 h-80 animate-pulse rounded-3xl bg-white" />
      ) : tab === 'daily' ? (
        <>
          <div className="mt-6 flex justify-end">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="premium-input max-w-52"
            />
          </div>
          <div className="premium-form-card mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_12rem]">
            <input
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder="Search voucher, customer, supplier or product"
              className="premium-input"
            />
            <select
              value={reportCategory}
              onChange={(event) =>
                setReportCategory(event.target.value as typeof reportCategory)
              }
              className="premium-input"
            >
              <option value="all">Phone + Computer</option>
              <option value="phone">Phone only</option>
              <option value="computer">Computer only</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="premium-input"
            >
              <option value="all">All payment methods</option>
              <option value="cash">Cash</option>
              <option value="kbz_pay">KBZ Pay</option>
              <option value="aya_pay">AYA Pay</option>
              <option value="wave_pay">Wave Pay</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                `${t(`reports.${period}`)} ${t('reports.income')}`,
                totals.income,
                t('reports.completedSales'),
              ],
              [
                t('reports.purchaseCost'),
                totals.purchaseCost,
                t('reports.stockReceived'),
              ],
              [t('reports.soldCost'), totals.soldCost, t('reports.costBasis')],
              [t('reports.grossProfit'), totals.profit, t('reports.incomeMinusCost')],
            ].map(([label, value, hint]) => (
              <div
                key={label as string}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {money(value as number)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <List
              title={t('reports.phoneSales')}
              rows={filteredReport.sales
                .filter((s: any) => s.category === 'phone')
                .map((s: any) => ({
                  main: s.invoice_number,
                  sub: s.pos_sale_items
                    .map((i: any) => i.product_name_snapshot)
                    .join(', '),
                  value: money(s.net_total_mmk),
                  onClick: () => void openReportDetail('sale', s.id),
                }))}
            />
            <List
              title={t('reports.computerSales')}
              rows={filteredReport.sales
                .filter((s: any) => s.category === 'computer')
                .map((s: any) => ({
                  main: s.invoice_number,
                  sub: s.pos_sale_items
                    .map((i: any) => i.product_name_snapshot)
                    .join(', '),
                  value: money(s.net_total_mmk),
                  onClick: () => void openReportDetail('sale', s.id),
                }))}
            />
            <List
              title={t('reports.phonePurchases')}
              rows={filteredReport.phonePurchases.map((p: any) => ({
                main: p.purchase_number,
                sub: `${(p.purchase_items ?? []).map(phonePurchaseItemName).join(', ') || 'Phone purchase'} · ${p.seller_name_snapshot || 'Walk-in seller'}`,
                value: money(
                  (p.purchase_items ?? []).reduce(
                    (x: number, i: any) => x + Number(i.purchase_price_mmk),
                    0,
                  ),
                ),
                onClick: () => void openReportDetail('phonePurchase', p.id),
              }))}
            />
            <List
              title={t('reports.computerPurchases')}
              rows={filteredReport.computerPurchases.map((p: any) => ({
                main: p.purchase_number,
                sub: `${p.brand ?? ''} ${p.model_name ?? ''}`,
                value: money(p.purchase_price),
                onClick: () => void openReportDetail('computerPurchase', p.id),
              }))}
            />
          </div>
          {detailLoading && (
            <div className="fixed inset-0 z-[145] grid place-items-center bg-slate-950/45 backdrop-blur-sm">
              <div className="rounded-2xl bg-white px-6 py-4 font-semibold shadow-2xl">
                Loading details…
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="premium-form-card">
            <label className="text-sm font-semibold text-slate-700">
              Search warranty or voucher
            </label>
            <input
              value={warrantySearch}
              onChange={(e) => setWarrantySearch(e.target.value)}
              placeholder="Invoice, customer, phone, device, IMEI or serial"
              className="premium-input mt-2"
            />
          </section>
          {(['active', 'expired', 'archived'] as const).map((status) => (
            <section key={status} className="premium-form-card">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold capitalize">{status} warranty</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  {visibleWarranty[status].length}
                </span>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {visibleWarranty[status].map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{item.product_name_snapshot}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.pos_sales.invoice_number} ·{' '}
                        {item.pos_sales.customer_name_snapshot} · expires{' '}
                        {new Date(item.warranty_expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setVoucher(item)}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                    >
                      View voucher
                    </button>
                    {profile?.role === 'owner' && status === 'expired' && (
                      <button
                        onClick={() => void archive(item.id)}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                      >
                        Archive
                      </button>
                    )}
                    {profile?.role === 'owner' &&
                      status === 'archived' &&
                      !item.purged_at && (
                        <button
                          onClick={() => void purge(item)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          Purge device data
                        </button>
                      )}
                    {item.purged_at && (
                      <span className="text-xs font-semibold text-slate-400">
                        Device data purged
                      </span>
                    )}
                  </div>
                ))}
                {!visibleWarranty[status].length && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No {status} warranty items.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
      {voucher && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Sales voucher
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {voucher.pos_sales.invoice_number}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(voucher.pos_sales.sale_date).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setVoucher(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl"
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <VoucherFact
                label="Status"
                value={
                  voucher.pos_sales.voided_at || voucher.is_voided
                    ? 'Cancelled'
                    : 'Completed'
                }
              />
              <VoucherFact
                label="Category"
                value={voucher.category_snapshot === 'computer' ? 'Computer' : 'Phone'}
              />
              <p>
                <span className="text-slate-500">Customer</span>
                <br />
                <b>{voucher.pos_sales.customer_name_snapshot}</b>
              </p>
              <p>
                <span className="text-slate-500">Phone</span>
                <br />
                <b>{voucher.pos_sales.customer_phone_snapshot || '—'}</b>
              </p>
              <p>
                <span className="text-slate-500">Sold by</span>
                <br />
                <b>
                  {voucher.pos_sales.sold_by_name_snapshot ||
                    voucher.pos_sales.profiles?.full_name ||
                    'Staff'}
                </b>
              </p>
              <p>
                <span className="text-slate-500">Payment</span>
                <br />
                <b className="capitalize">
                  {voucher.pos_sales.payment_method.replaceAll('_', ' ')}
                </b>
              </p>
              <VoucherFact
                label="Data record"
                value={
                  voucher.purged_at
                    ? 'Compact archive · photos removed'
                    : voucher.archived_at
                      ? 'Archived · device data retained'
                      : 'Full record'
                }
              />
            </div>
            <div className="mt-5 border-y border-slate-200 py-4">
              <p className="font-semibold">{voucher.product_name_snapshot}</p>
              <p className="mt-1 text-xs text-slate-500">
                {voucher.category_snapshot === 'computer' ? 'Serial number' : 'IMEI'}:{' '}
                {voucher.serial_snapshot || '—'}
              </p>
              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <VoucherFact
                  label="Purchased"
                  value={formatDate(voucher.purchase_date_snapshot)}
                />
                <VoucherFact
                  label="Sold"
                  value={formatDate(voucher.pos_sales.sale_date, true)}
                />
                <VoucherFact
                  label="Warranty started"
                  value={formatDate(voucher.warranty_started_at)}
                />
                <VoucherFact
                  label="Warranty expires"
                  value={formatDate(voucher.warranty_expires_at)}
                />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span>Listed selling price</span>
                <span>{money(voucher.unit_price_mmk)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-rose-600">
                <span>Discount amount</span>
                <span>- {money(voucher.discount_mmk)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span>Net selling price</span>
                <span>{money(voucher.net_price_mmk)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span>Purchase cost</span>
                <span>{money(voucher.purchase_cost_snapshot_mmk)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm font-semibold text-emerald-700">
                <span>Profit</span>
                <span>
                  {money(
                    voucher.profit_snapshot_mmk ??
                      Number(voucher.net_price_mmk) -
                        Number(voucher.purchase_cost_snapshot_mmk),
                  )}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xl font-bold">
              <span>Voucher total</span>
              <span>{money(voucher.pos_sales.net_total_mmk)}</span>
            </div>
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-[11px] leading-4 text-amber-900">
              <b>Warranty:</b> {formatDate(voucher.warranty_started_at)} –{' '}
              {formatDate(voucher.warranty_expires_at)}
              <p className="mt-2 whitespace-pre-wrap text-[10px] leading-[1.45]">
                {voucher.warranty_terms_snapshot}
              </p>
            </div>
            {(profile?.role === 'owner' || profile?.role === 'manager') && (
              <button
                type="button"
                onClick={() => setCancelTarget(voucher)}
                className="mt-5 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                Cancel voucher &amp; restore stock
              </button>
            )}
          </div>
        </div>
      )}
      {reportDetail && (
        <ReportRecordModal detail={reportDetail} onClose={() => setReportDetail(null)} />
      )}
      <CancelVoucherDialog
        open={cancelTarget !== null}
        invoiceNumber={cancelTarget?.pos_sales.invoice_number ?? ''}
        busy={cancelling}
        error={cancelError}
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null)
            setCancelError(null)
          }
        }}
        onConfirm={(reason) => cancelTarget && void cancelVoucher(cancelTarget, reason)}
      />
    </section>
  )
}

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return includeTime ? date.toLocaleString() : date.toLocaleDateString()
}

function VoucherFact({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-slate-500">{label}</span>
      <br />
      <b>{value}</b>
    </p>
  )
}
function relationOne(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function phonePurchaseItemName(item: any) {
  const device = relationOne(item?.device_units)
  const model = relationOne(device?.product_models)
  const brand = relationOne(model?.brands)
  return [brand?.name, model?.name].filter(Boolean).join(' ') || 'Phone'
}

function ReportRecordModal({
  detail,
  onClose,
}: {
  detail: { kind: 'sale' | 'phonePurchase' | 'computerPurchase'; record: any }
  onClose: () => void
}) {
  const { kind, record } = detail
  const saleItems = record.pos_sale_items ?? []
  const phoneItems = record.purchase_items ?? []
  const title = kind === 'sale' ? record.invoice_number : record.purchase_number
  return (
    <div
      className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={onClose}
    >
      <section
        className="mx-auto my-5 w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {kind === 'sale' ? 'Sales voucher' : 'Purchase record'}
            </p>
            <h2 className="mt-1 break-all text-2xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(
                kind === 'sale' ? record.sale_date : record.purchase_date,
                true,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl"
          >
            ×
          </button>
        </div>

        {kind === 'sale' && (
          <>
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <VoucherFact
                label="Status"
                value={record.voided_at ? 'Cancelled' : 'Completed'}
              />
              <VoucherFact
                label="Customer"
                value={record.customer_name_snapshot || 'Walk-in customer'}
              />
              <VoucherFact label="Phone" value={record.customer_phone_snapshot || '—'} />
              <VoucherFact
                label="Sold by"
                value={
                  record.sold_by_name_snapshot ||
                  relationOne(record.profiles)?.full_name ||
                  'Staff'
                }
              />
              <VoucherFact
                label="Payment"
                value={String(record.payment_method ?? 'cash').replaceAll('_', ' ')}
              />
            </div>
            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-4">
              {saleItems.map((item: any) => (
                <div key={item.id} className="py-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.product_name_snapshot}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.category_snapshot === 'computer' ? 'Serial' : 'IMEI'}:{' '}
                        {item.serial_snapshot || '—'}
                      </p>
                    </div>
                    <p className="font-semibold">{money(item.net_price_mmk)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
                    <span>Price: {money(item.unit_price_mmk)}</span>
                    <span>Discount: {money(item.discount_mmk)}</span>
                    <span>
                      Profit:{' '}
                      {money(
                        item.profit_snapshot_mmk ??
                          Number(item.net_price_mmk) -
                            Number(item.purchase_cost_snapshot_mmk),
                      )}
                    </span>
                    <span>Warranty: {formatDate(item.warranty_expires_at)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-between text-xl font-bold">
              <span>Voucher total</span>
              <span>{money(record.net_total_mmk)}</span>
            </div>
          </>
        )}

        {kind === 'phonePurchase' && (
          <>
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <VoucherFact
                label="Seller type"
                value={record.seller_contact_id ? 'Supplier' : 'One-time seller'}
              />
              <VoucherFact
                label="Seller / supplier"
                value={record.seller_name_snapshot || 'Walk-in seller'}
              />
              <VoucherFact label="Phone" value={record.seller_phone_snapshot || '—'} />
            </div>
            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 px-4">
              {phoneItems.map((item: any) => {
                const device = relationOne(item.device_units)
                return (
                  <div key={item.id} className="py-4">
                    <p className="font-semibold text-slate-950">
                      {phonePurchaseItemName(item)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      IMEI: {device?.imei_1 || '—'}
                      {device?.imei_2 ? ` · IMEI 2: ${device.imei_2}` : ''}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <span>Cost: {money(item.purchase_price_mmk)}</span>
                      <span>Selling price: {money(device?.sale_price_mmk ?? 0)}</span>
                      <span>
                        Status: {String(device?.status ?? '—').replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {kind === 'computerPurchase' && (
          <>
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <VoucherFact
                label="Supplier / seller"
                value={record.purchase_from || 'Walk-in seller'}
              />
              <VoucherFact label="Phone" value={record.seller_phone || '—'} />
              <VoucherFact label="Condition" value={record.condition || '—'} />
              <VoucherFact
                label="Status"
                value={String(record.status ?? '—').replaceAll('_', ' ')}
              />
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <p className="text-lg font-semibold text-slate-950">
                {[record.brand, record.model_name].filter(Boolean).join(' ') ||
                  'Computer'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Serial: {record.serial_number || '—'}
              </p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <VoucherFact label="CPU" value={record.cpu || '—'} />
                <VoucherFact label="RAM" value={record.ram || '—'} />
                <VoucherFact label="Storage" value={record.storage || '—'} />
                <VoucherFact label="GPU" value={record.gpu || '—'} />
                <VoucherFact label="Purchase cost" value={money(record.purchase_price)} />
                <VoucherFact label="Selling price" value={money(record.sale_price)} />
              </div>
            </div>
          </>
        )}
        {(record.notes || record.purchase_notes) && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
            <b>Notes:</b> {record.notes || record.purchase_notes}
          </div>
        )}
      </section>
    </div>
  )
}
function List({
  title,
  rows,
}: {
  title: string
  rows: Array<{ main: string; sub: string; value: string; onClick?: () => void }>
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [rows])
  useEffect(() => setPage((value) => Math.min(value, totalPages)), [totalPages])
  return (
    <section className="premium-form-card">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 max-h-[28rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
        {visibleRows.map((row, index) => (
          <button
            type="button"
            key={`${row.main}-${index}`}
            onClick={row.onClick}
            className="flex w-full items-center justify-between gap-4 py-3 text-left transition hover:bg-blue-50/70 disabled:cursor-default disabled:hover:bg-transparent"
            disabled={!row.onClick}
          >
            <div>
              <p className="text-sm font-semibold">{row.main}</p>
              <p className="text-xs text-slate-500">{row.sub}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-sm font-semibold">{row.value}</p>
              {row.onClick && <span className="text-blue-600">›</span>}
            </div>
          </button>
        ))}
        {!rows.length && (
          <p className="py-8 text-center text-sm text-slate-400">
            {t('reports.noRecords')}
          </p>
        )}
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalItems={rows.length}
        onPage={setPage}
      />
    </section>
  )
}

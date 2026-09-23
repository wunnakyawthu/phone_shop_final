import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContactPicker } from '../contacts/ContactPicker'
import { PaginationBar } from '../../components/navigation/PaginationBar'
import { getErrorMessage } from '../../lib/errors/app-error'
import {
  createPosSale,
  loadCustomerHistory,
  loadPosInventory,
  loadReceiptSettings,
  type CustomerSale,
  type PosCartItem,
  type PosCategory,
  type PosInventoryItem,
  type ReceiptSettings,
} from './posApi'

const money = (value: number) =>
  `${new Intl.NumberFormat('en-US').format(Math.round(value))} MMK`

export function PosPage({ category }: { category: PosCategory }) {
  const [inventory, setInventory] = useState<PosInventoryItem[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<'newest' | 'price_low' | 'price_high'>('newest')
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [warrantyDurationDays, setWarrantyDurationDays] = useState(30)
  const [settings, setSettings] = useState<ReceiptSettings | null>(null)
  const [history, setHistory] = useState<CustomerSale[]>([])
  const [receipt, setReceipt] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([loadPosInventory(category), loadReceiptSettings()])
      .then(([items, shop]) => {
        setInventory(items)
        setSettings(shop)
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [category])
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const minimum = minPrice === '' ? null : Number(minPrice)
    const maximum = maxPrice === '' ? null : Number(maxPrice)
    const result = inventory.filter((i) => {
      if (q && !`${i.name} ${i.serial ?? ''} ${i.detail}`.toLowerCase().includes(q))
        return false
      if (minimum !== null && i.price < minimum) return false
      if (maximum !== null && i.price > maximum) return false
      return true
    })
    if (sort === 'price_low') result.sort((a, b) => a.price - b.price)
    if (sort === 'price_high') result.sort((a, b) => b.price - a.price)
    return result
  }, [inventory, maxPrice, minPrice, search, sort])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleInventory = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [search, minPrice, maxPrice, sort, category])
  useEffect(() => setPage((value) => Math.min(value, totalPages)), [totalPages])
  const subtotal = cart.reduce((sum, i) => sum + i.price, 0)
  const discount = cart.reduce((sum, i) => sum + i.discountMmk, 0)
  const total = subtotal - discount
  const title = category === 'phone' ? 'Phone POS' : 'Computer POS'

  function add(item: PosInventoryItem) {
    if (!cart.some((x) => x.id === item.id))
      setCart((x) => [...x, { ...item, discountMmk: 0 }])
  }
  async function findHistory() {
    try {
      setHistory(await loadCustomerHistory(customerPhone))
    } catch {
      setHistory([])
    }
  }
  async function complete() {
    if (!settings || !cart.length || saving) return
    setSaving(true)
    setError(null)
    try {
      const sale = await createPosSale({
        category,
        customerName,
        customerPhone,
        paymentMethod,
        notes,
        warrantyTerms: settings.warrantyTerms,
        warrantyDurationDays,
        items: cart,
      })
      setReceipt(sale)
      setInventory((all) => all.filter((i) => !cart.some((c) => c.id === i.id)))
      setCart([])
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-96 animate-pulse rounded-3xl bg-white" />
  return (
    <section className="pb-10">
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">Sales workspace</p>
          <h1 className="management-title">{title}</h1>
          <p className="management-subtitle">
            Select in-stock {category}s, apply optional discounts and complete one
            full-payment sale.
          </p>
        </div>
        <Link
          to={`/app/${category}s`}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
        >
          Back to inventory
        </Link>
      </div>
      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-5">
          <section className="pos-customer-card rounded-[1.7rem] border border-blue-200 bg-[linear-gradient(145deg,#eff6ff,#ffffff)] p-5 shadow-[0_12px_34px_rgba(37,99,235,.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Customer information · optional
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Walk-in customer by default
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a phone number to see this customer's previous purchases.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                Optional
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ContactPicker
                kind="customer"
                name={customerName}
                phone={customerPhone}
                onChange={(value) => {
                  setCustomerName(value.name)
                  setCustomerPhone(value.phone)
                  if (value.phone)
                    void loadCustomerHistory(value.phone)
                      .then(setHistory)
                      .catch(() => setHistory([]))
                }}
                placeholder="Customer name"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={() => void findHistory()}
                placeholder="Phone number"
                className="premium-input"
              />
            </div>
            {history.length > 0 && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm font-semibold text-blue-900">Previous purchases</p>
                {history.map((sale) => (
                  <div key={sale.id} className="mt-2 text-xs text-blue-800">
                    {sale.invoice_number} ·{' '}
                    {sale.pos_sale_items.map((i) => i.product_name_snapshot).join(', ')}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="premium-form-card">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_9rem_10rem]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${category}, serial or IMEI`}
                className="premium-input sm:col-span-2 xl:col-span-1"
              />
              <input
                type="text"
                inputMode="numeric"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="Min price"
                className="premium-input"
              />
              <input
                type="text"
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="Max price"
                className="premium-input"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="premium-input"
              >
                <option value="newest">Newest first</option>
                <option value="price_low">Price: low to high</option>
                <option value="price_high">Price: high to low</option>
              </select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleInventory.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => add(item)}
                  disabled={cart.some((x) => x.id === item.id)}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-blue-300 disabled:opacity-45"
                >
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-slate-100 text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.serial || item.detail || 'In stock'}
                    </p>
                    <p className="mt-2 text-sm font-bold text-blue-700">
                      {money(item.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {!filtered.length && (
              <p className="py-10 text-center text-sm text-slate-500">
                No matching in-stock items.
              </p>
            )}
            {filtered.length > pageSize && (
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPage={setPage}
              />
            )}
          </section>
        </div>
        <aside className="xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current sale</h2>
              <span className="text-xs text-slate-500">{cart.length} item(s)</span>
            </div>
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-500">{money(item.price)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from current sale`}
                      onClick={() => setCart((x) => x.filter((i) => i.id !== item.id))}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <span aria-hidden="true" className="text-base leading-none">
                        ×
                      </span>{' '}
                      Remove item
                    </button>
                  </div>
                  <label className="mt-3 block text-xs font-semibold text-slate-600">
                    Discount amount (MMK) · optional
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.discountMmk || ''}
                      placeholder="0"
                      onChange={(e) =>
                        setCart((all) =>
                          all.map((x) =>
                            x.id === item.id
                              ? {
                                  ...x,
                                  discountMmk: Math.min(
                                    x.price,
                                    Math.max(
                                      0,
                                      Number(e.target.value.replace(/\D/g, '')) || 0,
                                    ),
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    />
                    <span className="mt-2 flex justify-between font-normal text-slate-500">
                      <span>Final item price</span>
                      <b className="text-slate-800">
                        {money(item.price - item.discountMmk)}
                      </b>
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Discount</span>
                <span>- {money(discount)}</span>
              </div>
              <div className="flex justify-between pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="premium-input mt-4"
            >
              <option value="cash">Cash</option>
              <option value="kbz_pay">KBZ Pay</option>
              <option value="aya_pay">AYA Pay</option>
              <option value="wave_pay">Wave Pay</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Warranty period
              <select
                value={warrantyDurationDays}
                onChange={(e) => setWarrantyDurationDays(Number(e.target.value))}
                className="premium-input mt-2"
              >
                <option value={0}>No warranty</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sale notes (optional)"
              className="premium-input mt-3 min-h-20 py-3"
            />
            <button
              onClick={() => void complete()}
              disabled={!cart.length || saving}
              className="premium-button-brand mt-4 w-full disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Complete sale · ${money(total)}`}
            </button>
          </div>
        </aside>
      </div>
      {receipt && settings && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="pos-print-receipt mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{settings.storeName}</h2>
              <p className="text-sm text-slate-500">{settings.address}</p>
              <p className="text-sm text-slate-500">{settings.phone}</p>
              <p className="mt-3 font-semibold">SALES RECEIPT</p>
              <p className="text-xs text-slate-500">{receipt.invoice_number}</p>
            </div>
            <div className="mt-5 border-y border-dashed border-slate-300 py-3 text-sm">
              <p>Customer: {receipt.customer_name_snapshot}</p>
              {receipt.customer_phone_snapshot && (
                <p>Phone: {receipt.customer_phone_snapshot}</p>
              )}
            </div>
            <div className="my-4 space-y-3">
              {receipt.pos_sale_items.map((item: any) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{item.product_name_snapshot}</p>
                    <p className="text-xs text-slate-500">{item.serial_snapshot}</p>
                    {Number(item.discount_mmk) > 0 && (
                      <p className="text-xs text-slate-500">
                        {money(item.unit_price_mmk)} − discount {money(item.discount_mmk)}
                      </p>
                    )}
                  </div>
                  <p>{money(item.net_price_mmk)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-3 text-right">
              <p className="text-xl font-bold">Total {money(receipt.net_total_mmk)}</p>
              <p className="text-xs uppercase text-slate-500">
                {receipt.payment_method.replaceAll('_', ' ')}
              </p>
            </div>
            <div className="receipt-warranty mt-5 text-[10px] leading-[1.45] text-slate-600">
              <p className="font-semibold">Warranty terms</p>
              <p className="receipt-warranty-terms whitespace-pre-wrap">
                {settings.warrantyTerms}
              </p>
              <p className="mt-4 text-center">{settings.receiptFooter}</p>
            </div>
            <div className="mt-6 flex gap-2 print:hidden">
              <button onClick={printReceipt} className="premium-button-brand flex-1">
                Print receipt
              </button>
              <button onClick={() => setReceipt(null)} className="premium-button flex-1">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function printReceipt() {
  const receipt = document.querySelector('.pos-print-receipt')
  if (!receipt) return
  const popup = window.open('', '_blank', 'width=720,height=900')
  if (!popup) {
    window.print()
    return
  }
  popup.document.write(`<!doctype html><html><head><title>Sales receipt</title><style>
    @page{size:auto;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:Arial,sans-serif}.pos-print-receipt{width:100%;max-width:680px;margin:0 auto;padding:20px}.print\\:hidden{display:none!important}h2{text-align:center;margin:0 0 6px}p{margin:4px 0}.text-center{text-align:center}.text-right{text-align:right}.flex{display:flex}.justify-between{justify-content:space-between}.gap-4{gap:16px}.font-bold,.font-semibold{font-weight:700}.text-xl{font-size:20px}.text-2xl{font-size:24px}.text-sm{font-size:14px}.text-xs{font-size:12px}.mt-5{margin-top:20px}.mt-4{margin-top:16px}.mt-3{margin-top:12px}.my-4{margin:16px 0}.py-3{padding:12px 0}.pt-3{padding-top:12px}.border-y{border-top:1px dashed #aaa;border-bottom:1px dashed #aaa}.border-t{border-top:1px solid #ddd}.space-y-3>div+div{margin-top:12px}.receipt-warranty,.receipt-warranty-terms{font-size:9px!important;line-height:1.35!important}
  </style></head><body>${receipt.outerHTML}</body></html>`)
  popup.document.close()
  popup.focus()
  window.setTimeout(() => {
    popup.print()
    popup.close()
  }, 250)
}

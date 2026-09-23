import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { loadPhoneInventory } from './phoneInventoryApi'
import type { PhoneInventoryItem } from './phoneInventoryTypes'
import { useAuth } from '../auth/AuthProvider'
import { PaginationBar } from '../../components/navigation/PaginationBar'

function formatMmk(value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} MMK`
}

function statusLabel(status: PhoneInventoryItem['status']) {
  return status.replaceAll('_', ' ')
}

function statusClasses(status: PhoneInventoryItem['status']) {
  if (status === 'in_stock') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'sold') return 'bg-slate-100 text-slate-600 ring-slate-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

export function PhoneInventoryPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [items, setItems] = useState<PhoneInventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [deviceState, setDeviceState] = useState('all')
  const [brand, setBrand] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  useEffect(() => {
    let active = true

    void loadPhoneInventory()
      .then((data) => {
        if (active) setItems(data)
      })
      .catch((caught) => {
        if (active)
          setError(caught instanceof Error ? caught.message : 'Failed to load inventory.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false
      if (deviceState !== 'all' && item.deviceState !== deviceState) return false
      if (brand !== 'all' && item.brandName !== brand) return false
      if (minPrice !== '' && item.salePriceMmk < Number(minPrice)) return false
      if (maxPrice !== '' && item.salePriceMmk > Number(maxPrice)) return false
      if (purchaseDate && item.purchaseDate?.slice(0, 10) !== purchaseDate) return false
      if (!needle) return true

      return [
        item.brandName,
        item.modelName,
        item.color,
        item.imei1,
        item.imei2,
        item.iphoneRegionCode,
        item.purchaseNumber,
      ].some((value) => value?.toLowerCase().includes(needle))
    })
  }, [items, search, status, deviceState, brand, minPrice, maxPrice, purchaseDate])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(
    () => setPage(1),
    [search, status, deviceState, brand, minPrice, maxPrice, purchaseDate],
  )
  useEffect(() => setPage((value) => Math.min(value, totalPages)), [totalPages])

  const brands = useMemo(
    () =>
      [...new Set(['Apple', 'Samsung', ...items.map((item) => item.brandName)])].sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  )

  const inStock = items.filter((item) => item.status === 'in_stock').length
  const newPhones = items.filter(
    (item) => item.status === 'in_stock' && item.deviceState === 'new',
  ).length
  const usedPhones = items.filter(
    (item) => item.status === 'in_stock' && item.deviceState === 'used',
  ).length
  const stockValue = items
    .filter((item) => item.status === 'in_stock')
    .reduce((total, item) => total + (item.purchasePriceMmk ?? 0), 0)

  return (
    <section className="pb-6 sm:pb-8">
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">{t('inventory.phoneWorkspace')}</p>
          <h1 className="management-title">{t('inventory.phoneTitle')}</h1>
          <p className="management-subtitle">{t('inventory.phoneSubtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:flex-nowrap lg:items-center">
          <Link
            to="/app/phones/pos"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 sm:w-auto"
          >
            {t('inventory.openPhonePos')}
          </Link>
          {(profile?.role === 'owner' || profile?.role === 'manager') && (
            <Link
              to="/app/phones/deleted"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:text-red-700 lg:w-auto"
            >
              {t('inventory.deleteHistory')}
            </Link>
          )}
          <Link
            to="/app/phones/purchase"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 sm:w-fit"
          >
            <span className="text-lg leading-none">+</span> {t('inventory.newPurchase')}
          </Link>
        </div>
      </div>

      {!isLoading && inStock <= 15 && (
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
          <b>⚠ Low phone stock:</b> Only {inStock} phone(s) remain. Restock at or before
          the 15-item threshold.
        </div>
      )}

      <div className="mobile-scroll-row mt-5 flex snap-x gap-2 overflow-x-auto rounded-[1.75rem] border border-slate-200/70 bg-white p-2 shadow-[0_12px_34px_rgba(15,23,42,.06)] sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t('inventory.inStock'), inStock.toString(), t('inventory.availableDevices')],
          [
            t('inventory.newPhones'),
            newPhones.toString(),
            t('inventory.currentlyInStock'),
          ],
          [
            t('inventory.usedPhones'),
            usedPhones.toString(),
            t('inventory.currentlyInStock'),
          ],
          [
            t('inventory.stockCost'),
            formatMmk(stockValue),
            t('inventory.purchaseCostBasis'),
          ],
        ].map(([label, value, hint]) => (
          <div
            key={label}
            className="min-w-[9.4rem] snap-start rounded-[1.3rem] border border-slate-100 bg-slate-50/70 p-4 sm:min-w-0 sm:p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:text-xs">
              {label}
            </p>
            <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:mt-2 sm:text-2xl">
              {value}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:mt-1 sm:text-xs">{hint}</p>
          </div>
        ))}
      </div>

      <div className="premium-form-card mt-4 sm:mt-5">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_9rem_9rem_10rem] lg:gap-3">
          <label className="relative col-span-2 lg:col-span-1">
            <span className="sr-only">Search inventory</span>
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('inventory.searchPhone')}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm text-slate-900 transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="all">{t('inventory.allStatus')}</option>
            <option value="in_stock">{t('inventory.inStock')}</option>
            <option value="sold">{t('inventory.sold')}</option>
          </select>

          <select
            value={deviceState}
            onChange={(event) => setDeviceState(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="all">{t('inventory.newUsed')}</option>
            <option value="new">{t('inventory.new')}</option>
            <option value="used">{t('inventory.used')}</option>
          </select>

          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="col-span-2 min-h-12 rounded-2xl lg:col-span-1 border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="all">{t('inventory.allBrands')}</option>
            {brands.map((brandName) => (
              <option key={brandName} value={brandName}>
                {brandName}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ''))}
            placeholder="Min price"
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-700"
          />
          <input
            type="text"
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))}
            placeholder="Max price"
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-700"
          />
          <label className="relative col-span-2 lg:col-span-1">
            <span className="sr-only">Purchase date</span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              title="Filter by purchase date"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-700"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl bg-white shadow-sm sm:rounded-3xl"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-900">{t('inventory.noPhones')}</p>
          <p className="mt-2 text-sm text-slate-500">{t('inventory.tryDifferent')}</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map((item) => (
            <Link
              key={item.id}
              to={`/app/phones/${item.id}`}
              className="group min-w-0 overflow-hidden rounded-[1.65rem] border border-white/90 bg-white p-2 shadow-[0_14px_36px_rgba(15,23,42,.07)] transition duration-300 sm:rounded-[1.9rem] sm:p-3.5 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_52px_rgba(15,23,42,.12)]"
            >
              <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-slate-100 sm:mb-3 sm:aspect-[4/3] sm:rounded-2xl">
                {item.photoUrls[0] ? (
                  <img
                    src={item.photoUrls[0]}
                    alt={`${item.brandName} ${item.modelName}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xs font-bold text-slate-400">
                    No product photo
                  </div>
                )}
              </div>

              <div className="min-w-0 sm:flex sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600 sm:text-xs">
                    {item.brandName}
                  </p>
                  <h2 className="mt-0.5 line-clamp-2 text-sm font-bold leading-5 tracking-tight text-slate-950 sm:mt-1 sm:truncate sm:text-lg">
                    {item.modelName}
                  </h2>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-0 sm:shrink-0 sm:flex-col sm:items-end sm:gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${statusClasses(item.status)}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                  {item.isPubliclyVisible && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                      On website
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-slate-600 sm:mt-3 sm:gap-1.5 sm:text-[11px]">
                <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5 capitalize">
                  {item.deviceState}
                </span>
                {item.storageCapacityGb && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    {item.storageCapacityGb} GB
                  </span>
                )}
                {item.color && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    {item.color}
                  </span>
                )}
                {item.iphoneRegionCode && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    Region {item.iphoneRegionCode}
                  </span>
                )}
                {item.batteryHealthPercent !== null && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    Battery {item.batteryHealthPercent}%
                  </span>
                )}
              </div>

              <div className="mt-2 border-t border-slate-100 pt-2 sm:mt-3 sm:pt-3">
                <p className="text-xs font-semibold text-slate-400">IMEI</p>
                <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-700 sm:mt-1 sm:text-sm">
                  {item.imei1 ?? '—'}
                </p>
              </div>

              <div className="mt-2 flex items-end justify-between gap-2 sm:mt-3 sm:gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Sale price</p>
                  <p className="mt-0.5 text-sm font-bold leading-5 text-slate-950 sm:mt-1 sm:text-lg">
                    {formatMmk(item.salePriceMmk)}
                  </p>
                </div>
                <span className="hidden text-sm font-bold text-brand-600 transition group-hover:translate-x-1 sm:inline">
                  View →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          onPage={setPage}
        />
      )}
    </section>
  )
}

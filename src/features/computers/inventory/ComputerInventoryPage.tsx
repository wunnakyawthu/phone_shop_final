import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../../lib/supabase/client'
import { getComputerPhotoUrl } from '../purchases/computerPhotoUpload'
import { PaginationBar } from '../../../components/navigation/PaginationBar'

type ComputerItem = {
  id: string
  cover_photo_path: string | null
  brand: string | null
  computer_type: string
  model_name: string
  cpu: string | null
  ram: string | null
  primary_storage_type: string | null
  primary_storage_size: string | null
  secondary_storage_type: string | null
  secondary_storage_size: string | null
  gpu: string | null
  screen_size: string | null
  color: string | null
  serial_number: string | null
  condition: string | null
  purchase_from: string | null
  purchase_date: string | null
  purchase_price: number | null
  sale_price: number | null
  status: string | null
  created_at: string
  updated_at: string
  is_publicly_visible: boolean
}

function formatMmk(value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} MMK`
}

function formatComputerType(value: string) {
  const labels: Record<string, string> = {
    macbook: 'MacBook',
    windows_laptop: 'Windows Laptop',
    all_in_one: 'All-in-One',
    desktop_system_unit: 'Desktop System Unit',
    laptop: 'Laptop',
    desktop: 'Desktop',
    mini_pc: 'Mini PC',
    workstation: 'Workstation',
    gaming_pc: 'Gaming PC',
  }

  return labels[value] ?? value.replaceAll('_', ' ')
}

function formatCondition(value: string | null) {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatStatus(value: string | null) {
  if (!value) return '—'
  return value.replaceAll('_', ' ')
}

function statusClasses(status: string | null) {
  if (status === 'in_stock') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  }

  if (status === 'sold') {
    return 'bg-slate-100 text-slate-600 ring-slate-200'
  }

  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

export default function ComputerInventoryPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const [computers, setComputers] = useState<ComputerItem[]>([])

  const [loading, setLoading] = useState(true)

  const [errorMessage, setErrorMessage] = useState('')

  const [search, setSearch] = useState('')

  const [status, setStatus] = useState('all')

  const [condition, setCondition] = useState('all')

  const [brand, setBrand] = useState('all')

  const [computerType, setComputerType] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const canManageDeleteHistory = profile?.role === 'owner' || profile?.role === 'manager'

  useEffect(() => {
    void loadComputers()
  }, [])

  async function loadComputers() {
    if (!supabase) {
      setErrorMessage('Supabase client is not configured.')
      setLoading(false)
      return
    }

    try {
      setErrorMessage('')

      const { data, error } = await supabase
        .from('computer_inventory_items')
        .select(
          `
          *,
          computer_inventory_photos (
            storage_path,
            sort_order
          )
        `,
        )
        .eq('is_deleted', false)
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        throw error
      }

      const computerList = (data ?? []).map((item) => {
        const sortedPhotos = [...(item.computer_inventory_photos ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        )

        return {
          ...item,
          cover_photo_path: sortedPhotos[0]?.storage_path ?? null,
        }
      })

      setComputers(computerList as ComputerItem[])
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load computer inventory.',
      )
    } finally {
      setLoading(false)
    }
  }

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          computers
            .map((item) => item.brand)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [computers],
  )

  const computerTypes = useMemo(
    () =>
      Array.from(
        new Set(computers.map((item) => item.computer_type).filter(Boolean)),
      ).sort((a, b) => formatComputerType(a).localeCompare(formatComputerType(b))),
    [computers],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return computers.filter((computer) => {
      if (status !== 'all' && computer.status !== status) {
        return false
      }

      if (condition !== 'all' && computer.condition !== condition) {
        return false
      }

      if (brand !== 'all' && computer.brand !== brand) {
        return false
      }

      if (computerType !== 'all' && computer.computer_type !== computerType) {
        return false
      }
      if (minPrice !== '' && Number(computer.sale_price ?? 0) < Number(minPrice))
        return false
      if (maxPrice !== '' && Number(computer.sale_price ?? 0) > Number(maxPrice))
        return false
      if (purchaseDate && computer.purchase_date?.slice(0, 10) !== purchaseDate)
        return false

      if (!needle) {
        return true
      }

      return [
        computer.brand,
        computer.model_name,
        computer.serial_number,
        computer.cpu,
        computer.ram,
        computer.primary_storage_type,
        computer.primary_storage_size,
        computer.secondary_storage_type,
        computer.secondary_storage_size,
        computer.gpu,
        computer.screen_size,
        computer.color,
        computer.purchase_from,
      ].some((value) => value?.toString().toLowerCase().includes(needle))
    })
  }, [
    computers,
    search,
    status,
    condition,
    brand,
    computerType,
    minPrice,
    maxPrice,
    purchaseDate,
  ])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(
    () => setPage(1),
    [search, status, condition, brand, computerType, minPrice, maxPrice, purchaseDate],
  )
  useEffect(() => setPage((value) => Math.min(value, totalPages)), [totalPages])

  const inStock = computers.filter((item) => item.status === 'in_stock').length

  const newComputers = computers.filter(
    (item) => item.status === 'in_stock' && item.condition === 'new',
  ).length

  const usedComputers = computers.filter(
    (item) => item.status === 'in_stock' && item.condition === 'used',
  ).length

  const stockCost = computers
    .filter((item) => item.status === 'in_stock')
    .reduce((total, item) => total + (item.purchase_price ?? 0), 0)

  return (
    <section className="pb-6 sm:pb-8">
      {/* Header */}
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">{t('inventory.computerWorkspace')}</p>
          <h1 className="management-title">{t('inventory.computerTitle')}</h1>
          <p className="management-subtitle">{t('inventory.computerSubtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:flex-nowrap lg:items-center">
          <Link
            to="/app/computers/pos"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100 sm:w-auto"
          >
            {t('inventory.openComputerPos')}
          </Link>
          {canManageDeleteHistory && (
            <Link
              to="/app/computers/deleted"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:text-red-700 lg:w-auto"
            >
              {t('inventory.deleteHistory')}
            </Link>
          )}
          <Link
            to="/app/computers/purchase"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 sm:w-fit"
          >
            <span className="text-lg leading-none">+</span> {t('inventory.newPurchase')}
          </Link>
        </div>
      </div>

      {!loading && inStock <= 15 && (
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
          <b>⚠ Low computer stock:</b> Only {inStock} computer(s) remain. Restock at or
          before the 15-item threshold.
        </div>
      )}

      {/* Summary cards */}
      <div className="mobile-scroll-row mt-5 flex snap-x gap-2 overflow-x-auto rounded-[1.75rem] border border-slate-200/70 bg-white p-2 shadow-[0_12px_34px_rgba(15,23,42,.06)] sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t('inventory.inStock'), inStock.toString(), t('inventory.availableComputers')],
          [
            t('inventory.newComputers'),
            newComputers.toString(),
            t('inventory.currentlyInStock'),
          ],
          [
            t('inventory.usedComputers'),
            usedComputers.toString(),
            t('inventory.currentlyInStock'),
          ],
          [
            t('inventory.stockCost'),
            formatMmk(stockCost),
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

      {/* Filters */}
      <div className="premium-form-card mt-4 sm:mt-5">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_8rem_8rem_8rem_10rem] lg:gap-3">
          <label className="relative col-span-2 lg:col-span-1">
            <span className="sr-only">Search computer inventory</span>

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
              placeholder={t('inventory.searchComputer')}
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
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="all">{t('inventory.newUsed')}</option>
            <option value="new">{t('inventory.new')}</option>
            <option value="used">{t('inventory.used')}</option>
          </select>

          <select
            value={computerType}
            onChange={(event) => setComputerType(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="all">{t('inventory.allTypes')}</option>

            {computerTypes.map((type) => (
              <option key={type} value={type}>
                {formatComputerType(type)}
              </option>
            ))}
          </select>

          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="col-span-2 min-h-12 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 lg:col-span-1"
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

      {errorMessage && (
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Loading */}
      {loading ? (
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
          <p className="text-lg font-bold text-slate-900">{t('inventory.noComputers')}</p>

          <p className="mt-2 text-sm text-slate-500">{t('inventory.tryDifferent')}</p>

          <Link
            to="/app/computers/purchase"
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-bold text-white"
          >
            <span className="text-lg leading-none">+</span>
            {t('inventory.newPurchase')}
          </Link>
        </div>
      ) : (
        /* Computer cards */
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {paginated.map((computer) => (
            <Link
              key={computer.id}
              to={`/app/computers/${computer.id}`}
              className="group min-w-0 overflow-hidden rounded-[1.65rem] border border-white/90 bg-white p-2 shadow-[0_14px_36px_rgba(15,23,42,.07)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_52px_rgba(15,23,42,.12)] sm:rounded-[1.9rem] sm:p-3.5"
            >
              <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-slate-100 sm:mb-3 sm:aspect-[4/3] sm:rounded-2xl">
                {computer.cover_photo_path ? (
                  <img
                    src={getComputerPhotoUrl(computer.cover_photo_path)}
                    alt={`${computer.brand ?? ''} ${computer.model_name}`}
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
                    {computer.brand || 'Unknown Brand'}
                  </p>

                  <h2 className="mt-0.5 line-clamp-2 text-sm font-bold leading-5 tracking-tight text-slate-950 sm:mt-1 sm:truncate sm:text-lg">
                    {computer.model_name}
                  </h2>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-0 sm:shrink-0 sm:flex-col sm:items-end sm:gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${statusClasses(
                      computer.status,
                    )}`}
                  >
                    {formatStatus(computer.status)}
                  </span>
                  {computer.is_publicly_visible && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 sm:text-[11px]">
                      On website
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-slate-600 sm:mt-3 sm:gap-1.5 sm:text-[11px]">
                <span className="rounded-lg bg-slate-100 px-2 py-1 capitalize sm:rounded-xl sm:px-2.5 sm:py-1.5">
                  {formatCondition(computer.condition)}
                </span>

                {computer.ram && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    {computer.ram}
                  </span>
                )}

                {computer.primary_storage_size && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    {computer.primary_storage_size}
                    {computer.primary_storage_type
                      ? ` ${computer.primary_storage_type}`
                      : ''}
                  </span>
                )}

                {computer.color && (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                    {computer.color}
                  </span>
                )}
              </div>

              <div className="mt-2 border-t border-slate-100 pt-2 sm:mt-3 sm:pt-3">
                <p className="text-xs font-semibold text-slate-400">Serial Number</p>

                <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-700 sm:mt-1 sm:text-sm">
                  {computer.serial_number || '—'}
                </p>
              </div>

              <div className="mt-2 flex items-end justify-between gap-2 sm:mt-3 sm:gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Sale price</p>

                  <p className="mt-0.5 text-sm font-bold leading-5 text-slate-950 sm:mt-1 sm:text-lg">
                    {formatMmk(computer.sale_price ?? 0)}
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
      {!loading && filtered.length > 0 && (
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

import { useEffect, useMemo, useState } from 'react'
import type { Database } from '../../types/database.generated'
import { loadPublicCatalog } from './publicCatalogApi'
import type { PublicCatalogDevice } from './publicCatalogApi'
import { PublicCatalogLayout } from './PublicCatalogLayout'
import { PublicProductCard } from './PublicProductCard'

type Category = Database['public']['Enums']['product_category']

export function PublicCatalogPage({ category }: { category: Category }) {
  const [items, setItems] = useState<PublicCatalogDevice[]>([])
  const [search, setSearch] = useState('')
  const [state, setState] = useState<'all' | 'new' | 'used'>('all')
  const [brand, setBrand] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void loadPublicCatalog(category)
      .then((data) => active && setItems(data))
      .catch(
        (caught) =>
          active &&
          setError(caught instanceof Error ? caught.message : 'Could not load products.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [category])

  const brands = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.brandName))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [items],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter((item) => {
      if (state !== 'all' && item.deviceState !== state) return false
      if (brand !== 'all' && item.brandName !== brand) return false
      if (!needle) return true
      return [
        item.brandName,
        item.modelName,
        item.color,
        item.storageCapacityGb?.toString(),
        item.cpuProcessor,
        item.ramText,
      ].some((value) => value?.toLowerCase().includes(needle))
    })
  }, [items, search, state, brand])

  const isPhone = category === 'phone'
  const title = isPhone ? 'Phones in store' : 'Computers in store'

  return (
    <PublicCatalogLayout>
      <section className="relative overflow-hidden border-b border-black/[.06] bg-white">
        <div
          className="pointer-events-none absolute right-[-8rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-sky-100/70 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p
                className={`text-xs font-black uppercase tracking-[0.22em] ${isPhone ? 'text-blue-600' : 'text-violet-600'}`}
              >
                Live inventory
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Current store stock, real selling prices and product photos. Listings
                disappear when they are no longer available.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {items.length} live
              item{items.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-7 grid gap-2 rounded-[1.5rem] bg-[#f5f5f7] p-2 sm:grid-cols-[1fr_auto_auto] sm:p-3">
            <label className="relative">
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search brand, model, color or storage"
                className="min-h-12 w-full rounded-xl border-0 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[#0071e3]/25"
              />
            </label>
            <select
              value={state}
              onChange={(event) => setState(event.target.value as typeof state)}
              className="min-h-12 rounded-xl border-0 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#0071e3]/25"
            >
              <option value="all">New + Used</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="min-h-12 rounded-xl border-0 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#0071e3]/25"
            >
              <option value="all">All brands</option>
              {brands.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((x) => (
              <div
                key={x}
                className="h-96 animate-pulse rounded-[1.9rem] bg-white shadow-sm"
              />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <PublicProductCard key={item.publicId} device={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-black text-slate-900">
              No matching stock right now
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Try another search or check again later.
            </p>
          </div>
        )}
      </section>
    </PublicCatalogLayout>
  )
}

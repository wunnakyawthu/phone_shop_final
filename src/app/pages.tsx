import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../features/auth/AuthProvider'
import { useStoreBranding } from '../features/settings/storeBranding'
import { PublicCatalogLayout } from '../features/publicCatalog/PublicCatalogLayout'
import { PublicProductCard } from '../features/publicCatalog/PublicProductCard'
import { loadPublicCatalog } from '../features/publicCatalog/publicCatalogApi'
import type { PublicCatalogDevice } from '../features/publicCatalog/publicCatalogApi'
import {
  loadDashboardStats,
  type DashboardStats,
} from '../features/dashboard/dashboardApi'

function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MetricIcon({ index }: { index: number }) {
  const paths = [
    <>
      <rect key="a" x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path key="b" d="M10 18.5h4" />
    </>,
    <>
      <rect key="a" x="3" y="4" width="18" height="12" rx="2" />
      <path key="b" d="M8 21h8m-6-5v5m4-5v5" />
    </>,
    <>
      <path key="a" d="M4 6h16M6 6l1 14h10l1-14M9 10v6m6-6v6" />
      <path key="b" d="M9 3h6" />
    </>,
    <>
      <circle key="a" cx="12" cy="12" r="8" />
      <path
        key="b"
        d="M15 9.5c-.5-1-1.5-1.5-3-1.5-1.7 0-3 1-3 2.3 0 3.2 6 1.5 6 4.5 0 1.3-1.3 2.2-3 2.2-1.5 0-2.7-.6-3.3-1.7M12 6v12"
      />
    </>,
    <>
      <path key="a" d="M4 19V9l8-5 8 5v10" />
      <path key="b" d="M2 19h20M8 12h8M8 15h8" />
    </>,
    <>
      <path key="a" d="M4 18l5-5 3 3 7-9" />
      <path key="b" d="M15 7h4v4" />
    </>,
    <>
      <path key="a" d="M5 4h14v16H5z" />
      <path key="b" d="M8 8h8m-8 4h8m-8 4h5" />
    </>,
    <>
      <path key="a" d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" />
      <path key="b" d="m9 12 2 2 4-4" />
    </>,
  ]
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[index]}
    </svg>
  )
}

export function PublicHomePage() {
  const { branding } = useStoreBranding()
  const [phones, setPhones] = useState<PublicCatalogDevice[]>([])
  const [computers, setComputers] = useState<PublicCatalogDevice[]>([])

  useEffect(() => {
    let active = true
    void Promise.all([loadPublicCatalog('phone'), loadPublicCatalog('computer')])
      .then(([phoneData, computerData]) => {
        if (!active) return
        setPhones(phoneData.slice(0, 4))
        setComputers(computerData.slice(0, 4))
      })
      .catch(() => {
        // The public landing still renders if catalog loading fails.
      })
    return () => {
      active = false
    }
  }, [])

  const showcase = [...phones.slice(0, 2), ...computers.slice(0, 2)]

  return (
    <PublicCatalogLayout>
      <section className="relative overflow-hidden bg-white text-[#1d1d1f]">
        <div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-100/80 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-9 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
          <div className="self-center text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
              <span className="h-2 w-2 rounded-full bg-[#34c759]" /> Live inventory from{' '}
              {branding.storeName}
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-[2.7rem] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-6xl lg:mx-0 lg:text-7xl">
              Find your next device before you visit.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-normal leading-7 text-[#6e6e73] sm:text-lg lg:mx-0">
              Browse current phones and computers with real prices, useful specs and
              actual product photos — directly from our store inventory.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                to="/phones"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-medium text-white transition hover:bg-[#0077ed]"
              >
                Browse phones <ArrowIcon />
              </Link>
              <Link
                to="/computers"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#0071e3] px-5 text-sm font-medium text-[#0071e3] transition hover:bg-blue-50"
              >
                Browse computers <ArrowIcon />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-[#6e6e73] lg:justify-start">
              <span className="rounded-full bg-[#f5f5f7] px-3 py-2">
                ✓ Real store stock
              </span>
              <span className="rounded-full bg-[#f5f5f7] px-3 py-2">
                ✓ Current selling prices
              </span>
              <span className="rounded-full bg-[#f5f5f7] px-3 py-2">
                ✓ No account required
              </span>
            </div>
          </div>

          <div className="relative self-center">
            <div className="absolute -inset-4 rounded-[2.6rem] bg-gradient-to-br from-sky-100 to-purple-100 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-2 rounded-[2rem] bg-[#f5f5f7] p-2 shadow-[0_30px_80px_rgba(0,0,0,.12)] sm:gap-3 sm:p-3">
              {showcase.map((item) => (
                <Link
                  key={item.publicId}
                  to={`/products/${item.publicId}`}
                  className="group min-w-0 overflow-hidden rounded-[1.35rem] bg-white p-1.5 transition hover:-translate-y-1"
                >
                  <div className="aspect-square overflow-hidden rounded-[1.1rem] bg-[#f5f5f7]">
                    {item.photoUrls[0] ? (
                      <img
                        src={item.photoUrls[0]}
                        alt={item.modelName}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-bold text-slate-500">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-semibold">{item.modelName}</p>
                    <p className="mt-1 text-xs font-medium text-[#6e6e73]">
                      {new Intl.NumberFormat('en-US').format(item.salePriceMmk)} MMK
                    </p>
                  </div>
                </Link>
              ))}
              {!showcase.length && (
                <div className="col-span-2 grid aspect-[4/2.5] place-items-center rounded-[1.8rem] bg-white p-8 text-center text-sm font-medium text-[#6e6e73]">
                  Published products will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              Available now
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Latest phones
            </h2>
          </div>
          <Link
            to="/phones"
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
          >
            View all <ArrowIcon />
          </Link>
        </div>
        {phones.length ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {phones.map((item) => (
              <PublicProductCard key={item.publicId} device={item} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm font-bold text-slate-500 shadow-sm">
            No published phones yet.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
              Available now
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Latest computers
            </h2>
          </div>
          <Link
            to="/computers"
            className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 transition hover:bg-violet-100"
          >
            View all <ArrowIcon />
          </Link>
        </div>
        {computers.length ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {computers.map((item) => (
              <PublicProductCard key={item.publicId} device={item} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm font-bold text-slate-500 shadow-sm">
            Computer listings will appear here when added to inventory.
          </div>
        )}
      </section>
    </PublicCatalogLayout>
  )
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { branding } = useStoreBranding()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadDashboardStats()
      .then(setStats)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Could not load dashboard.'),
      )
  }, [])
  const money = (value: number) =>
    `MMK ${new Intl.NumberFormat('en-US').format(Math.round(value))}`

  const today = new Intl.DateTimeFormat(i18n.language === 'my' ? 'my-MM' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <section>
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">
            {t('dashboard.eyebrow')} · {today}
          </p>
          <h1 className="management-title">
            {t('dashboard.welcome')}, {profile?.fullName?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="management-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm font-extrabold text-slate-600 shadow-sm backdrop-blur">
          {branding.storeName} {t('dashboard.workspace')}
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!stats ? (
        <div className="mt-6 h-72 animate-pulse rounded-3xl bg-white" />
      ) : (
        <>
          {(stats.phoneStock <= 15 || stats.computerStock <= 15) && (
            <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-xl">⚠</div>
                <div>
                  <p className="font-bold">{t('dashboard.stockAlert')}</p>
                  <p className="mt-1 text-sm text-amber-800">{t('dashboard.stockAlertHint')}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-bold">
                {stats.phoneStock <= 15 && <Link to="/app/phones" className="rounded-full bg-white px-4 py-2 shadow-sm">Phones: {stats.phoneStock}</Link>}
                {stats.computerStock <= 15 && <Link to="/app/computers" className="rounded-full bg-white px-4 py-2 shadow-sm">Computers: {stats.computerStock}</Link>}
              </div>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              [
                t('dashboard.phoneStock'),
                stats.phoneStock,
                t('dashboard.ready'),
                'bg-indigo-50 text-indigo-600',
              ],
              [
                t('dashboard.computerStock'),
                stats.computerStock,
                t('dashboard.ready'),
                'bg-violet-50 text-violet-600',
              ],
              [
                t('dashboard.totalSold'),
                stats.totalSold,
                t('dashboard.last7'),
                'bg-emerald-50 text-emerald-600',
              ],
              [t('dashboard.revenue'), money(stats.revenue), t('dashboard.last7'), 'bg-sky-50 text-sky-600'],
              [
                t('dashboard.capital'),
                money(stats.capital),
                t('dashboard.registeredCost'),
                'bg-rose-50 text-rose-600',
              ],
              [
                t('dashboard.profit'),
                money(stats.profit),
                t('dashboard.last7'),
                'bg-emerald-50 text-emerald-600',
              ],
              [
                t('dashboard.todaySales'),
                money(stats.todaySales),
                t('dashboard.invoicedToday'),
                'bg-blue-50 text-blue-600',
              ],
              [
                t('dashboard.warranty'),
                stats.activeWarranty,
                t('dashboard.covered'),
                'bg-amber-50 text-amber-600',
              ],
            ].map(([label, value, hint, color], index) => (
              <div key={label as string} className="premium-dashboard-card">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
                  <MetricIcon index={index} />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,.7fr)]">
            <section className="premium-form-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{t('dashboard.trend')}</h2>
                  <p className="text-xs text-slate-500">{t('dashboard.last7')}</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-indigo-600">■ {t('dashboard.sales')}</span>
                  <span className="text-emerald-600">■ {t('dashboard.periodProfit')}</span>
                </div>
              </div>
              <div className="mt-8 flex h-56 items-end gap-3">
                {stats.trend.map((day) => {
                  const max = Math.max(
                    1,
                    ...stats.trend.flatMap((x) => [x.sales, x.profit]),
                  )
                  return (
                    <div
                      key={day.label}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex h-44 w-full items-end justify-center gap-1">
                        <div
                          className="w-1/3 rounded-t-md bg-indigo-500"
                          style={{ height: `${Math.max(3, (day.sales / max) * 100)}%` }}
                        />
                        <div
                          className="w-1/3 rounded-t-md bg-emerald-500"
                          style={{ height: `${Math.max(3, (day.profit / max) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{day.label}</span>
                    </div>
                  )
                })}
              </div>
            </section>
            <section className="premium-form-card">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent sales</h2>
                <Link to="/app/reports" className="text-xs font-semibold text-blue-600">
                  View reports
                </Link>
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {stats.recentSales.map((sale) => (
                  <div key={sale.id} className="py-3">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold">{sale.invoice_number}</p>
                      <p className="text-sm font-semibold">{money(sale.net_total_mmk)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {sale.customer_name_snapshot} · {sale.category}
                    </p>
                  </div>
                ))}
                {!stats.recentSales.length && (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No recent sales yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <section>
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">Workspace</p>
          <h1 className="management-title">{title}</h1>
          <p className="management-subtitle">
            More tools for this area will appear here.
          </p>
        </div>
      </div>
      <div className="mt-7 rounded-[2rem] border border-white/80 bg-white/85 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,.08)] backdrop-blur sm:p-12">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-xl font-black text-slate-500">
          +
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {t('common.comingSoon')}
        </p>
      </div>
    </section>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="grid min-h-svh place-items-center bg-slate-950 p-4 text-white">
      <section className="text-center">
        <p className="text-7xl font-black tracking-tighter text-blue-400">404</p>
        <p className="mt-3 text-slate-300">Page not found</p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-white px-5 font-black text-slate-950"
        >
          {t('common.backToHome')}
        </Link>
      </section>
    </main>
  )
}

import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from './LanguageSelector'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../../features/auth/AuthProvider'
import { useStoreBranding } from '../../features/settings/storeBranding'
import { StoreLogo } from '../branding/StoreLogo'
import type { AppRole } from '../../types/app'

type NavItem = {
  to: string
  key: 'dashboard' | 'phones' | 'computers' | 'customers' | 'suppliers' | 'reports' | 'settings'
  roles: AppRole[]
  icon: 'home' | 'phone' | 'computer' | 'users' | 'suppliers' | 'chart' | 'settings'
}

const navigation: NavItem[] = [
  {
    to: '/app',
    key: 'dashboard',
    roles: ['owner', 'manager'],
    icon: 'home',
  },
  { to: '/app/customers', key: 'customers', roles: ['owner', 'manager'], icon: 'users' },
  { to: '/app/suppliers', key: 'suppliers', roles: ['owner', 'manager'], icon: 'suppliers' },
  {
    to: '/app/phones',
    key: 'phones',
    roles: ['owner', 'manager', 'phone_staff'],
    icon: 'phone',
  },
  {
    to: '/app/computers',
    key: 'computers',
    roles: ['owner', 'manager', 'computer_staff'],
    icon: 'computer',
  },
  {
    to: '/app/reports',
    key: 'reports',
    roles: ['owner', 'manager', 'phone_staff', 'computer_staff'],
    icon: 'chart',
  },
  {
    to: '/app/settings',
    key: 'settings',
    roles: ['owner', 'manager'],
    icon: 'settings',
  },
]

function Icon({ name }: { name: NavItem['icon'] }) {
  const common = 'h-5 w-5'

  if (name === 'home') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3.5 10.5 12 3l8.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (name === 'phone') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
        <path d="M10 18.2h4" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'computer') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 21h8M10 16v5m4-5v5" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'chart') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M4 20V10m6 10V4m6 16v-7m4 7H2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (name === 'users' || name === 'suppliers') {
    return name === 'users' ? (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M15 5.5a3 3 0 0 1 0 5.5M16 14c2.7.3 4.2 2.3 4.5 6" strokeLinecap="round"/></svg>
    ) : (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" strokeLinejoin="round"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
    )
  }

  return (
    <svg
      className={common}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-2.78 2.78-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.12V21H9.68v-.08a1.8 1.8 0 0 0-.4-1.12 1.8 1.8 0 0 0-1-.6 1.8 1.8 0 0 0-1.98.36l-.06.06-2.78-2.78.06-.06A1.8 1.8 0 0 0 3.88 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.12-.4H2V9.68h.08a1.8 1.8 0 0 0 1.12-.4 1.8 1.8 0 0 0 .6-1 1.8 1.8 0 0 0-.36-1.98l-.06-.06L6.16 3.46l.06.06a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.12V2h3.92v.08a1.8 1.8 0 0 0 .4 1.12 1.8 1.8 0 0 0 1 .6 1.8 1.8 0 0 0 1.98-.36l.06-.06 2.78 2.78-.06.06a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 .6 1 1.8 1.8 0 0 0 1.12.4H21v3.92h-.08a1.8 1.8 0 0 0-1.12.4 1.8 1.8 0 0 0-.4 1.08Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#2f6bff,#6d5dfc)] text-sm font-black text-white shadow-[0_8px_24px_rgba(47,107,255,.28)] ring-1 ring-white/50">
      {initials}
    </div>
  )
}

function BrandMark({ logoUrl }: { logoUrl: string | null }) {
  return <StoreLogo logoUrl={logoUrl} />
}

export function AppShell() {
  const [mobileUserOpen, setMobileUserOpen] = useState(false)
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()
  const { branding } = useStoreBranding()
  const role = profile?.role
  const visibleNavigation = role
    ? navigation.filter((item) => item.roles.includes(role))
    : []

  return (
    <div className="app-shell min-h-svh lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="app-sidebar hidden px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <Link to="/app" className="group flex items-center gap-3 px-2">
          {BrandMark({ logoUrl: branding.logoUrl })}
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-[-0.01em] text-slate-950">
              {branding.storeName}
            </p>
            <p className="text-[11px] font-semibold tracking-wide text-slate-400">
              {branding.workspaceLabel}
            </p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1.5" aria-label="Primary">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.to}
              end={item.to === '/app'}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-2xl px-3.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[linear-gradient(135deg,#2563eb,#4f46e5)] text-white shadow-[0_14px_30px_rgba(37,99,235,.24)]'
                    : 'text-slate-500 hover:bg-white/90 hover:text-slate-950 hover:shadow-sm'
                }`
              }
            >
              <Icon name={item.icon} />
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-account-panel mt-auto rounded-[1.6rem] border border-white/80 bg-white/72 p-3.5 shadow-[0_16px_40px_rgba(15,23,42,.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <UserAvatar name={profile?.fullName ?? 'User'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {profile?.fullName ?? 'User'}
              </p>
              <p className="truncate text-xs capitalize text-slate-500">
                {role?.replace('_', ' ') ?? ''}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 items-end gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-10 flex-1 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              {t('common.signOut')}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="mobile-safe-top sticky top-0 z-40 border-b border-white/70 bg-white/82 px-3 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,.05)] backdrop-blur-2xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Link to="/app" className="flex min-w-0 items-center gap-2.5">
              {BrandMark({ logoUrl: branding.logoUrl })}
              <span className="truncate font-semibold tracking-tight text-slate-950">
                {branding.storeName}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="hidden min-[390px]:block">
                <LanguageSelector />
              </div>
              <button
                type="button"
                aria-label="Open account menu"
                onClick={() => setMobileUserOpen((value) => !value)}
                className="rounded-xl"
              >
                <UserAvatar name={profile?.fullName ?? 'User'} />
              </button>
            </div>
          </div>
          {mobileUserOpen && (
            <div className="absolute right-3 top-[calc(100%+0.55rem)] w-60 rounded-3xl border border-white/80 bg-white/95 p-4 shadow-[0_24px_60px_rgba(15,23,42,.18)] backdrop-blur-2xl">
              <p className="truncate text-sm font-bold text-slate-900">
                {profile?.fullName ?? 'User'}
              </p>
              <p className="mt-0.5 text-xs capitalize text-slate-500">
                {role?.replace('_', ' ') ?? ''}
              </p>
              <div className="mt-3 min-[390px]:hidden">
                <LanguageSelector />
              </div>
              <div className="mt-3 flex">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 min-h-11 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700"
              >
                {t('common.signOut')}
              </button>
            </div>
          )}
        </header>

        <main className="relative mx-auto w-full max-w-[92rem] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
          <Outlet />
        </main>

        <nav
          aria-label="Primary"
          className="mobile-safe-bottom fixed inset-x-2 bottom-2 z-50 rounded-[1.55rem] border border-white/80 bg-white/88 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.2)] backdrop-blur-2xl lg:hidden"
        >
          <div className="mx-auto grid max-w-xl grid-flow-col auto-cols-fr gap-1">
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                end={item.to === '/app'}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-[3.7rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition-all duration-200 ${
                    isActive
                      ? 'bg-[linear-gradient(135deg,#2563eb,#4f46e5)] text-white shadow-[0_10px_24px_rgba(37,99,235,.25)]'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon name={item.icon} />
                <span className="max-w-full truncate">{t(`nav.${item.key}`)}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

import { useEffect, type PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { StoreLogo } from '../../components/branding/StoreLogo'
import { FacebookIcon, TelegramIcon, ViberIcon } from '../../components/icons/SocialIcons'
import { useStoreBranding } from '../settings/storeBranding'

export function PublicCatalogLayout({ children }: PropsWithChildren) {
  const { branding } = useStoreBranding()

  useEffect(() => {
    const root = document.documentElement
    const restoreDark = root.classList.contains('dark')
    root.classList.remove('dark')
    return () => {
      if (restoreDark) root.classList.add('dark')
    }
  }, [])

  return (
    <main className="public-catalog-root min-h-svh bg-[#f5f5f7] text-[#1d1d1f]">
      <header className="sticky top-0 z-40 border-b border-black/[.06] bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <StoreLogo logoUrl={branding.logoUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-slate-950 transition group-hover:text-blue-700 sm:text-base">
                {branding.storeName}
              </p>
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                Live store inventory
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 sm:flex">
            <NavLink
              to="/phones"
              className={({ isActive }) =>
                `border-b-2 px-1 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-[#1d1d1f] text-[#1d1d1f]'
                    : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'
                }`
              }
            >
              Phones
            </NavLink>
            <NavLink
              to="/computers"
              className={({ isActive }) =>
                `border-b-2 px-1 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-[#1d1d1f] text-[#1d1d1f]'
                    : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'
                }`
              }
            >
              Computers
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `border-b-2 px-1 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-[#1d1d1f] text-[#1d1d1f]'
                    : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'
                }`
              }
            >
              Contact
            </NavLink>
          </nav>

          <Link
            to="/sign-in"
            className="inline-flex min-h-9 items-center rounded-full bg-[#1d1d1f] px-4 text-xs font-medium text-white transition hover:bg-black"
          >
            Login
          </Link>
        </div>

        <nav className="mx-4 mb-2 flex max-w-7xl gap-1 rounded-full bg-[#f5f5f7] p-1 sm:hidden">
          <NavLink
            to="/phones"
            className={({ isActive }) =>
              `flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                isActive ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-slate-600'
              }`
            }
          >
            Phones
          </NavLink>
          <NavLink
            to="/computers"
            className={({ isActive }) =>
              `flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                isActive ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-slate-600'
              }`
            }
          >
            Computers
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                isActive ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-slate-600'
              }`
            }
          >
            Contact
          </NavLink>
        </nav>
      </header>

      {children}

      <footer className="mt-12 border-t border-black/[.08] bg-[#f5f5f7] text-[#6e6e73]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.9fr_1fr] lg:px-8 lg:py-16">
          <div>
            <div className="flex items-center gap-3">
              <StoreLogo logoUrl={branding.logoUrl} size="sm" />
              <div>
                <p className="font-semibold text-[#1d1d1f]">{branding.storeName}</p>
                <p className="text-xs text-slate-500">
                  Phones · Computers · Trusted service
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Browse real in-store devices, current prices and product photos before
              visiting our shop.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#1d1d1f]">
              Shop
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <Link to="/phones" className="block hover:text-[#1d1d1f]">
                Phones
              </Link>
              <Link to="/computers" className="block hover:text-[#1d1d1f]">
                Computers
              </Link>
              <Link to="/" className="block hover:text-[#1d1d1f]">
                Latest arrivals
              </Link>
              <Link to="/contact" className="block hover:text-[#1d1d1f]">
                Contact us
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#1d1d1f]">
              Contact
            </p>
            <div className="mt-4 space-y-3 text-sm">
              {branding.phone ? (
                <a href={`tel:${branding.phone}`} className="block hover:text-[#1d1d1f]">
                  {branding.phone}
                </a>
              ) : (
                <p>Contact details coming soon</p>
              )}
              {branding.address && <p className="text-slate-500">{branding.address}</p>}
              <p className="text-slate-500">
                Open daily · Visit our store for availability
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#1d1d1f]">
              Follow us
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {branding.facebookUrl && (
                <a
                  href={branding.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:text-[#1d1d1f]"
                >
                  <FacebookIcon className="h-3.5 w-3.5 text-[#1877f2]" />
                  Facebook
                </a>
              )}
              {branding.viberUrl && (
                <a
                  href={branding.viberUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:text-[#1d1d1f]"
                >
                  <ViberIcon className="h-3.5 w-3.5 text-[#7360f2]" />
                  Viber
                </a>
              )}
              {branding.tiktokUrl && (
                <a
                  href={branding.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:text-[#1d1d1f]"
                >
                  TikTok
                </a>
              )}
              {branding.telegramUrl && (
                <a
                  href={branding.telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:text-[#1d1d1f]"
                >
                  <TelegramIcon className="h-3.5 w-3.5 text-[#229ED9]" />
                  Telegram
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-black/[.08]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-3 sm:px-6 lg:px-8">
            <p>
              © {new Date().getFullYear()} {branding.storeName}. All rights reserved.
            </p>
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>Developed by</span>
              <a
                href="https://www.facebook.com/wunna.kyaw.thu.wnkt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#1d1d1f] transition hover:text-[#1877f2]"
              >
                <FacebookIcon className="h-3.5 w-3.5" />
                Wunna Kyaw Thu
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '../../lib/errors/app-error'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { StoreLogo } from '../../components/branding/StoreLogo'
import { useStoreBranding } from '../settings/storeBranding'
import { useAuth } from './AuthProvider'
import { useToast } from '../../components/feedback/ToastProvider'

export function SignInPage() {
  const { t } = useTranslation()
  const { session, profile, signIn } = useAuth()
  const { showToast } = useToast()
  const { branding } = useStoreBranding()
  const location = useLocation()
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_staff_email') ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(localStorage.getItem('remembered_staff_email')))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session && profile) {
    return (
      <Navigate
        to={(location.state as { from?: string } | null)?.from ?? '/app'}
        replace
      />
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (rememberEmail) localStorage.setItem('remembered_staff_email', email.trim())
      else localStorage.removeItem('remembered_staff_email')
      await signIn(email, password)
      showToast(t('auth.loginSuccess'), 'success', t('auth.loginSuccessTitle'))
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f5f5f7] px-4 py-5 sm:grid sm:place-items-center sm:px-6 sm:py-8">

      <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2.4rem] border border-black/5 bg-white shadow-[0_30px_90px_rgba(0,0,0,.14)] lg:grid-cols-[1.08fr_.92fr]">
        <div className="relative hidden min-h-[42rem] overflow-hidden bg-[linear-gradient(145deg,#050505,#1d1d1f)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:36px_36px]" />

          <Link
            to="/"
            className="relative inline-flex items-center gap-3 font-black tracking-tight"
          >
            <StoreLogo logoUrl={branding.logoUrl} />
            <div>
              <p className="text-lg leading-tight">{branding.storeName}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400">
                STORE WORKSPACE
              </p>
            </div>
          </Link>

          <div className="relative max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-200 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Secure staff access
            </span>
            <h2 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em]">
              Your inventory, purchases and daily shop work in one place.
            </h2>
            <p className="mt-5 max-w-md text-base font-medium leading-7 text-slate-300">
              A focused workspace for phone and computer inventory, designed for fast
              daily operation on desktop and mobile.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {['Inventory', 'Purchases', 'Catalog'].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"
                >
                  <p className="text-xs font-extrabold text-slate-300">{label}</p>
                  <p className="mt-2 text-lg font-black text-white">Ready</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs font-semibold text-slate-500">
            {branding.storeName} · Management system
          </p>
        </div>

        <div className="relative p-6 sm:p-10 lg:p-12">
          <div className="flex items-center justify-between lg:justify-end">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2.5 font-black text-slate-950 lg:hidden"
            >
              <StoreLogo logoUrl={branding.logoUrl} size="sm" />
              <span className="truncate">{branding.storeName}</span>
            </Link>
          </div>

          <div className="mx-auto mt-12 max-w-md lg:mt-20">
            <h1 className="login-title text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              {t('auth.title')}
            </h1>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
              {t('auth.subtitle')}
            </p>

            {!isSupabaseConfigured ? (
              <p className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                {t('auth.configMissing')}
              </p>
            ) : (
              <form onSubmit={submit} className="mt-9 space-y-5">
                <label className="block text-sm font-extrabold text-slate-700">
                  {t('auth.email')}
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-[16px] font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/10"
                    placeholder="name@example.com"
                  />
                </label>

                <label className="block text-sm font-extrabold text-slate-700">
                  {t('auth.password')}
                  <div className="relative mt-2">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 pr-14 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-950/10"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-2 grid w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>{showPassword && <path d="m4 4 16 16" strokeLinecap="round"/>}</svg>
                  </button>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                  <input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} className="mt-0.5 h-4 w-4 accent-slate-950" />
                  <span><b className="text-slate-800">Remember sign-in</b><br/><span className="text-xs">Your browser can securely offer to save the password.</span></span>
                </label>

                {error && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
                  >
                    {error}
                  </p>
                )}

                <button
                  disabled={submitting}
                  className="min-h-14 w-full rounded-2xl bg-[#1d1d1f] px-5 font-black text-white shadow-[0_12px_28px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? t('common.loading') : t('common.signIn')}
                </button>
              </form>
            )}

            <Link
              to="/"
              className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 transition hover:text-blue-600"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100">
                ←
              </span>
              Return to customer catalog
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

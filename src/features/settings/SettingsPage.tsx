import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

import { StoreLogo } from '../../components/branding/StoreLogo'
import { useAuth } from '../auth/AuthProvider'
import { createClientId } from '../../lib/id'
import { supabase } from '../../lib/supabase/client'
import { useStoreBranding } from './storeBranding'
import { StaffManagement } from './StaffManagement'
import { useToast } from '../../components/feedback/ToastProvider'

const inputClass =
  'min-h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'

function clean(value: string) {
  return value.trim() || null
}

function fileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ['png', 'jpg', 'jpeg', 'webp'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function SettingsPage() {
  const { profile } = useAuth()
  const { branding, refreshBranding } = useStoreBranding()
  const { showToast } = useToast()

  const [storeName, setStoreName] = useState(branding.storeName)
  const [workspaceLabel, setWorkspaceLabel] = useState(branding.workspaceLabel)
  const [phone, setPhone] = useState(branding.phone ?? '')
  const [facebookUrl, setFacebookUrl] = useState(branding.facebookUrl ?? '')
  const [viberUrl, setViberUrl] = useState(branding.viberUrl ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(branding.tiktokUrl ?? '')
  const [telegramUrl, setTelegramUrl] = useState(branding.telegramUrl ?? '')
  const [address, setAddress] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    branding.googleMapsUrl ?? 'https://maps.app.goo.gl/8cf3TtDqJ8wbCuU28',
  )
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your purchase.')
  const [warrantyTerms, setWarrantyTerms] = useState('')
  const [currentLogoPath, setCurrentLogoPath] = useState(branding.logoPath)
  const [newLogo, setNewLogo] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const newLogoPreview = useMemo(
    () => (newLogo ? URL.createObjectURL(newLogo) : null),
    [newLogo],
  )

  useEffect(() => {
    return () => {
      if (newLogoPreview) URL.revokeObjectURL(newLogoPreview)
    }
  }, [newLogoPreview])

  useEffect(() => {
    if (profile?.role === 'manager') {
      setLoading(false)
      return
    }
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    let active = true

    async function loadSettings() {
      try {
        const { data, error: loadError } = await (client as any)
          .from('store_settings')
          .select(
            'store_name, workspace_label, phone, facebook_url, viber_url, tiktok_url, telegram_url, logo_path, address, google_maps_url, receipt_footer, warranty_terms',
          )
          .eq('id', true)
          .maybeSingle()

        if (!active) return
        if (loadError) {
          setError(loadError.message)
          return
        }
        if (!data) return

        setStoreName(data.store_name)
        setWorkspaceLabel(data.workspace_label ?? 'Store workspace')
        setPhone(data.phone ?? '')
        setFacebookUrl(data.facebook_url ?? '')
        setViberUrl(data.viber_url ?? '')
        setTiktokUrl(data.tiktok_url ?? '')
        setTelegramUrl(data.telegram_url ?? '')
        setAddress((data as any).address ?? '')
        setGoogleMapsUrl(
          (data as any).google_maps_url ?? 'https://maps.app.goo.gl/8cf3TtDqJ8wbCuU28',
        )
        setReceiptFooter((data as any).receipt_footer ?? 'Thank you for your purchase.')
        setWarrantyTerms((data as any).warranty_terms ?? '')
        setCurrentLogoPath(data.logo_path)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [profile?.role])

  const previewLogoUrl = removeLogo ? null : (newLogoPreview ?? branding.logoUrl)

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    setError(null)

    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Logo must be a PNG, JPG or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be 2 MB or smaller.')
      return
    }

    setNewLogo(file)
    setRemoveLogo(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !profile || saving) return

    const nextName = storeName.trim()
    if (!nextName) {
      setError('Store name is required.')
      return
    }

    setSaving(true)
    setError(null)

    let uploadedPath: string | null = null

    try {
      let nextLogoPath = removeLogo ? null : currentLogoPath

      if (newLogo) {
        uploadedPath = `logo/${Date.now()}-${createClientId()}.${fileExtension(newLogo)}`
        const { error: uploadError } = await supabase.storage
          .from('store-branding')
          .upload(uploadedPath, newLogo, {
            cacheControl: '3600',
            upsert: false,
            contentType: newLogo.type,
          })
        if (uploadError) throw uploadError
        nextLogoPath = uploadedPath
      }

      const { error: saveError } = await (supabase as any).from('store_settings').upsert({
        id: true,
        store_name: nextName,
        workspace_label: workspaceLabel.trim() || 'Store workspace',
        phone: clean(phone),
        facebook_url: clean(facebookUrl),
        viber_url: clean(viberUrl),
        tiktok_url: clean(tiktokUrl),
        telegram_url: clean(telegramUrl),
        logo_path: nextLogoPath,
        address: clean(address),
        google_maps_url: clean(googleMapsUrl),
        receipt_footer: clean(receiptFooter),
        warranty_terms: warrantyTerms.trim(),
        updated_by: profile.id,
      })
      if (saveError) throw saveError

      const previousLogo = currentLogoPath
      setCurrentLogoPath(nextLogoPath)
      setNewLogo(null)
      setRemoveLogo(false)

      if (previousLogo && previousLogo !== nextLogoPath) {
        await supabase.storage.from('store-branding').remove([previousLogo])
      }

      await refreshBranding()
      showToast(
        'Branding updated. Customer view, staff login and management workspace now use these details.',
      )
    } catch (caught) {
      if (uploadedPath) {
        await supabase.storage.from('store-branding').remove([uploadedPath])
      }
      setError(
        caught instanceof Error ? caught.message : 'Could not save store settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-80 animate-pulse rounded-[2rem] bg-white/80 shadow-sm" />
  }

  if (profile?.role === 'manager') {
    return (
      <section className="pb-10">
        <div className="management-page-hero">
          <div>
            <p className="management-eyebrow">Management settings</p>
            <h1 className="management-title">Staff access</h1>
            <p className="management-subtitle">
              Create, edit, activate or deactivate staff and assign Phone or Computer
              access.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <StaffManagement />
        </div>
      </section>
    )
  }

  return (
    <section className="pb-10">
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">Owner settings</p>
          <h1 className="management-title">Store identity</h1>
          <p className="management-subtitle">
            Change the shop name and logo once. The customer catalog, staff login and
            management workspace update together.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live branding
        </span>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">
          {error}
        </div>
      )}
      <div className="mt-6">
        <StaffManagement />
      </div>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]"
      >
        <div className="space-y-6">
          <section className="premium-form-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold text-blue-600">Brand</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  Name & logo
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Use a clean square logo for the best result on mobile and desktop.
                </p>
              </div>
              <StoreLogo logoUrl={previewLogoUrl} size="lg" />
            </div>

            <label className="mt-6 block space-y-2">
              <span className="text-sm font-extrabold text-slate-700">Store name</span>
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                maxLength={80}
                className={inputClass}
                placeholder="Retail Hub"
              />
            </label>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-extrabold text-slate-700">
                Workspace subtitle
              </span>
              <input
                value={workspaceLabel}
                onChange={(event) => setWorkspaceLabel(event.target.value)}
                maxLength={60}
                className={inputClass}
                placeholder="Store workspace"
              />
              <span className="block text-xs text-slate-500">
                This text appears below the store name in the staff sidebar.
              </span>
            </label>

            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-extrabold text-slate-900">Store logo</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    PNG, JPG or WebP · maximum 2 MB.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-extrabold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800">
                    Choose logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={chooseLogo}
                      className="sr-only"
                    />
                  </label>
                  {(currentLogoPath || newLogo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewLogo(null)
                        setRemoveLogo(true)
                      }}
                      className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="premium-form-card">
            <p className="text-sm font-semibold text-emerald-600">POS receipt</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Voucher & warranty
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              These details are printed on every Phone and Computer POS receipt.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Store address
                </span>
                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={2}
                  className={`${inputClass} py-3`}
                  placeholder="Store address"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Warranty terms & conditions
                </span>
                <textarea
                  value={warrantyTerms}
                  onChange={(event) => setWarrantyTerms(event.target.value)}
                  rows={6}
                  className={`${inputClass} py-3`}
                  placeholder="Write the warranty coverage, exclusions and claim requirements."
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Receipt footer
                </span>
                <input
                  value={receiptFooter}
                  onChange={(event) => setReceiptFooter(event.target.value)}
                  className={inputClass}
                  placeholder="Thank you for your purchase."
                />
              </label>
            </div>
          </section>

          <section className="premium-form-card">
            <p className="text-sm font-extrabold text-violet-600">Customer contact</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
              Public store details
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              These fields are safe public contact details and can be used across the
              customer catalog.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-extrabold text-slate-700">Phone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={inputClass}
                  placeholder="09..."
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-extrabold text-slate-700">
                  Facebook URL
                </span>
                <input
                  value={facebookUrl}
                  onChange={(event) => setFacebookUrl(event.target.value)}
                  className={inputClass}
                  placeholder="https://facebook.com/..."
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-extrabold text-slate-700">Viber URL</span>
                <input
                  value={viberUrl}
                  onChange={(event) => setViberUrl(event.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-extrabold text-slate-700">TikTok URL</span>
                <input
                  value={tiktokUrl}
                  onChange={(event) => setTiktokUrl(event.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-extrabold text-slate-700">Telegram URL</span>
                <input
                  type="url"
                  value={telegramUrl}
                  onChange={(event) => setTelegramUrl(event.target.value)}
                  className={inputClass}
                  placeholder="https://t.me/your_store"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-extrabold text-slate-700">
                  Google Maps URL
                </span>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(event) => setGoogleMapsUrl(event.target.value)}
                  className={inputClass}
                  placeholder="https://maps.app.goo.gl/..."
                />
                <span className="block text-xs font-medium text-slate-500">
                  Used by the Directions button on the public Contact page.
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,.12)] backdrop-blur-xl">
            <div className="bg-[radial-gradient(circle_at_80%_0%,rgba(99,102,241,.42),transparent_45%),linear-gradient(145deg,#07111f,#111c34)] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                Live preview
              </p>
              <div className="mt-5 flex items-center gap-3">
                <StoreLogo logoUrl={previewLogoUrl} size="lg" className="self-center" />
                <div className="min-w-0">
                  <p className="truncate text-2xl font-black tracking-tight">
                    {storeName.trim() || 'Store name'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    Live inventory · {workspaceLabel.trim() || 'Store workspace'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Applies to
              </p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Customer catalog</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Staff sign-in</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  Management sidebar
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-5 min-h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-5 font-extrabold text-white shadow-[0_12px_30px_rgba(37,99,235,.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save branding'}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </section>
  )
}

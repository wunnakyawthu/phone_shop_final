import { PublicCatalogLayout } from './PublicCatalogLayout'
import { useStoreBranding } from '../settings/storeBranding'
import type { ReactNode } from 'react'
import { FacebookIcon, TelegramIcon, ViberIcon } from '../../components/icons/SocialIcons'

function ContactIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f5f5f7] text-lg text-[#1d1d1f]">
      {children}
    </span>
  )
}

export function PublicContactPage() {
  const { branding } = useStoreBranding()
  const mapsUrl = branding.googleMapsUrl || 'https://maps.app.goo.gl/8cf3TtDqJ8wbCuU28'
  const mapQuery = mapsUrl.includes('8cf3TtDqJ8wbCuU28')
    ? '16.6834237,98.510736'
    : branding.address?.trim() || branding.storeName
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`

  return (
    <PublicCatalogLayout>
      <section className="overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#0071e3]">
            Contact us
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-[-.04em] text-[#1d1d1f] sm:text-6xl">
            We’re here to help.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6e6e73] sm:text-lg">
            Ask about availability, pricing or visit {branding.storeName} in person.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-4">
            {branding.phone && (
              <a
                href={`tel:${branding.phone}`}
                className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[.06] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <ContactIcon>☎</ContactIcon>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#86868b]">
                    Call us
                  </span>
                  <span className="mt-1 block font-semibold text-[#1d1d1f]">
                    {branding.phone}
                  </span>
                </span>
              </a>
            )}
            <div className="flex items-start gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[.06]">
              <ContactIcon>⌖</ContactIcon>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#86868b]">
                  Store address
                </span>
                <span className="mt-1 block font-semibold leading-6 text-[#1d1d1f]">
                  {branding.address || 'Open Google Maps for our current location.'}
                </span>
              </span>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[.06]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
                Message us
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {branding.facebookUrl && (
                  <a
                    href={branding.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1877f2] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <FacebookIcon className="h-5 w-5" />
                    Facebook
                  </a>
                )}
                {branding.viberUrl && (
                  <a
                    href={branding.viberUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#7360f2] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <ViberIcon className="h-5 w-5" />
                    Viber
                  </a>
                )}
                {branding.tiktokUrl && (
                  <a
                    href={branding.tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#1d1d1f]"
                  >
                    TikTok
                  </a>
                )}
                {branding.telegramUrl && (
                  <a
                    href={branding.telegramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <TelegramIcon className="h-5 w-5" />
                    Telegram
                  </a>
                )}
                {!branding.facebookUrl && !branding.viberUrl && !branding.tiktokUrl && !branding.telegramUrl && (
                  <p className="text-sm text-[#6e6e73]">
                    Social contact details will appear here when configured.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-black/[.06]">
            <div className="relative min-h-[22rem] sm:min-h-[27rem]">
              <iframe
                title={`${branding.storeName} location map`}
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
              />
            </div>
            <div className="flex flex-col gap-3 border-t border-black/[.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="font-semibold text-[#1d1d1f]">Find our store</p>
                <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
                  Open Google Maps for exact directions and travel time.
                </p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Directions ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </PublicCatalogLayout>
  )
}

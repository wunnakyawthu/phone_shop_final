import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../../lib/supabase/client'

export type StoreBranding = {
  storeName: string
  workspaceLabel: string
  logoPath: string | null
  logoUrl: string | null
  phone: string | null
  facebookUrl: string | null
  viberUrl: string | null
  tiktokUrl: string | null
  telegramUrl: string | null
  address: string | null
  googleMapsUrl: string | null
}

type StoreBrandingContextValue = {
  branding: StoreBranding
  isLoading: boolean
  refreshBranding: () => Promise<void>
}

const FALLBACK_BRANDING: StoreBranding = {
  storeName: 'Retail Hub',
  workspaceLabel: 'Store workspace',
  logoPath: null,
  logoUrl: null,
  phone: null,
  facebookUrl: null,
  viberUrl: null,
  tiktokUrl: null,
  telegramUrl: null,
  address: null,
  googleMapsUrl: 'https://maps.app.goo.gl/8cf3TtDqJ8wbCuU28',
}

const StoreBrandingContext = createContext<StoreBrandingContextValue | null>(null)

function logoUrlFromPath(path: string | null) {
  if (!path || !supabase) return null
  return supabase.storage.from('store-branding').getPublicUrl(path).data.publicUrl
}

export function StoreBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<StoreBranding>(FALLBACK_BRANDING)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))

  const refreshBranding = useCallback(async () => {
    if (!supabase) {
      setBranding(FALLBACK_BRANDING)
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_public_store_branding')
      if (error) throw error

      const row = data?.[0] as any
      if (!row) {
        setBranding(FALLBACK_BRANDING)
        return
      }

      setBranding({
        storeName: row.store_name?.trim() || FALLBACK_BRANDING.storeName,
        workspaceLabel: row.workspace_label?.trim() || FALLBACK_BRANDING.workspaceLabel,
        logoPath: row.logo_path,
        logoUrl: logoUrlFromPath(row.logo_path),
        phone: row.phone,
        facebookUrl: row.facebook_url,
        viberUrl: row.viber_url,
        tiktokUrl: row.tiktok_url,
        telegramUrl: row.telegram_url,
        address: row.address,
        googleMapsUrl: row.google_maps_url,
      })
    } catch {
      // Keep the application usable before the branding migration is applied.
      setBranding((current) => (current.storeName ? current : FALLBACK_BRANDING))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshBranding()
  }, [refreshBranding])

  useEffect(() => {
    document.title = branding.storeName

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (icon) {
      icon.href = branding.logoUrl ?? '/favicon.svg'
      icon.type = branding.logoUrl ? 'image/png' : 'image/svg+xml'
    }
  }, [branding.logoUrl, branding.storeName])

  const value = useMemo(
    () => ({ branding, isLoading, refreshBranding }),
    [branding, isLoading, refreshBranding],
  )

  return (
    <StoreBrandingContext.Provider value={value}>
      {children}
    </StoreBrandingContext.Provider>
  )
}

export function useStoreBranding() {
  const value = useContext(StoreBrandingContext)
  if (!value)
    throw new Error('useStoreBranding must be used inside StoreBrandingProvider')
  return value
}

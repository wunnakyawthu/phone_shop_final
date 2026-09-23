import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { getStaffProfile, type StaffProfile } from '../../lib/auth/profile-service'

import { getErrorMessage } from '../../lib/errors/app-error'
import { supabase } from '../../lib/supabase/client'

type AuthState = {
  session: Session | null
  profile: StaffProfile | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  const [profile, setProfile] = useState<StaffProfile | null>(null)

  const [isLoading, setIsLoading] = useState(() => Boolean(supabase))

  const [error, setError] = useState<string | null>(null)

  const profileRef = useRef<StaffProfile | null>(null)

  const requestIdRef = useRef(0)

  const clearAuthState = useCallback(() => {
    requestIdRef.current += 1

    profileRef.current = null

    setSession(null)
    setProfile(null)
    setIsLoading(false)
  }, [])

  const syncSession = useCallback(
    async (nextSession: Session | null, showLoading = false) => {
      if (!nextSession) {
        clearAuthState()
        return
      }

      setSession(nextSession)

      const currentProfile = profileRef.current

      /*
       * Same signed-in user.
       *
       * Token refreshes and browser tab focus changes must NOT
       * clear/refetch the profile or rebuild the protected UI.
       */
      if (currentProfile?.id === nextSession.user.id) {
        setError(null)
        setIsLoading(false)
        return
      }

      const requestId = ++requestIdRef.current

      if (showLoading) {
        setIsLoading(true)
      }

      try {
        const nextProfile = await getStaffProfile(nextSession.user)

        /*
         * Ignore an old request if a newer auth change has
         * happened while this request was running.
         */
        if (requestId !== requestIdRef.current) {
          return
        }

        if (!nextProfile) {
          setError('auth.missingProfile')

          await supabase?.auth.signOut()

          clearAuthState()
          return
        }

        if (!nextProfile.isActive) {
          setError('auth.inactive')

          await supabase?.auth.signOut()

          clearAuthState()
          return
        }

        profileRef.current = nextProfile

        setProfile(nextProfile)
        setError(null)
      } catch (caught) {
        if (requestId !== requestIdRef.current) {
          return
        }

        setError(getErrorMessage(caught))
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [clearAuthState],
  )

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return undefined
    }

    let active = true

    /*
     * Listen for real authentication changes.
     *
     * TOKEN_REFRESHED is intentionally handled without loading
     * the staff profile again.
     */
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return
      }

      /*
       * getSession() below is responsible for the initial
       * application bootstrap.
       */
      if (event === 'INITIAL_SESSION') {
        return
      }

      /*
       * Supabase periodically refreshes the access token.
       * Keep the existing profile/UI intact.
       */
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession)
        return
      }

      /*
       * Supabase can emit SIGNED_IN again for the same user.
       * Do not throw away the already-loaded profile.
       */
      if (
        event === 'SIGNED_IN' &&
        nextSession &&
        profileRef.current?.id === nextSession.user.id
      ) {
        setSession(nextSession)
        return
      }

      void syncSession(nextSession)
    })

    /*
     * Initial application startup.
     *
     * Only this initial bootstrap is allowed to show the
     * application-wide auth loading state.
     */
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) {
        return
      }

      if (sessionError) {
        setError(getErrorMessage(sessionError))
        setIsLoading(false)
        return
      }

      void syncSession(data.session, true)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [syncSession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      throw signInError
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      clearAuthState()
      return
    }

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      throw signOutError
    }

    clearAuthState()
  }, [clearAuthState])

  const value = useMemo(
    () => ({
      session,
      profile,
      isLoading,
      error,
      signIn,
      signOut,
    }),
    [session, profile, isLoading, error, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

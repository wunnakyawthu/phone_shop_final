import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Toast = { id: number; message: string; tone: 'success' | 'error'; title?: string }
type ToastContextValue = {
  showToast: (message: string, tone?: Toast['tone'], title?: string) => void
}
const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success', title?: string) => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, tone, title }])
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      4000,
    )
  }, [])
  const value = useMemo(() => ({ showToast }), [showToast])
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 top-3 z-[200] ml-auto flex max-w-md flex-col gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[25rem]"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 text-slate-950 shadow-[0_18px_55px_rgba(15,23,42,.2)] ${toast.tone === 'success' ? 'border-emerald-200' : 'border-red-200'}`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${toast.tone === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
            >
              {toast.tone === 'success' ? '✓' : '!'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {toast.title ?? (toast.tone === 'success' ? 'Saved successfully' : 'Action failed')}
              </p>
              <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

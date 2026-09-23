import { useEffect } from 'react'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return undefined
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-end bg-slate-950/40 p-4 sm:place-items-center"
      role="presentation"
      onMouseDown={onCancel}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirmation-title" className="text-lg font-bold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border bg-white font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-slate-800"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

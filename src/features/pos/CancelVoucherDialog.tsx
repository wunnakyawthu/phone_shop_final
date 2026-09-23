import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function CancelVoucherDialog({
  open,
  invoiceNumber,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  invoiceNumber: string
  busy: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState(() => t('voucher.defaultReason'))
  const close = () => {
    setReason(t('voucher.defaultReason'))
    onClose()
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[140] grid place-items-end bg-slate-950/55 p-3 backdrop-blur-sm sm:place-items-center sm:p-5"
      onMouseDown={() => !busy && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-voucher-title"
        className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-2xl sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">!</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600">{t('voucher.cancel')}</p>
            <h2 id="cancel-voucher-title" className="mt-1 break-all text-xl font-semibold text-slate-950">{invoiceNumber}</h2>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{t('voucher.confirm')}</p>
        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-700">{t('voucher.reason')}</span>
          <textarea
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={300}
            className="premium-input mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </label>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={close} className="min-h-12 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
          <button type="button" disabled={busy || !reason.trim()} onClick={() => onConfirm(reason)} className="min-h-12 rounded-2xl bg-red-600 px-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 disabled:opacity-50">{busy ? t('voucher.cancelling') : t('voucher.confirmCancel')}</button>
        </div>
      </section>
    </div>
  )
}

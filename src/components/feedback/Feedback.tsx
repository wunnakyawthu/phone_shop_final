import { useTranslation } from 'react-i18next'

export function LoadingState() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {t('common.loading')}
    </div>
  )
}
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-dashed bg-white p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </section>
  )
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center"
    >
      <p className="font-semibold text-red-900">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-red-800 shadow-sm"
        >
          {t('common.retry')}
        </button>
      )}
    </section>
  )
}

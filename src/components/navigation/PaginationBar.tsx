export function PaginationBar({
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
      <span className="text-slate-500">
        {totalItems} matching item(s) · Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

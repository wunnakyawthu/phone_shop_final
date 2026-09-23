import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3.5 text-sm font-extrabold text-slate-600 shadow-sm shadow-slate-200/50 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:text-blue-700 hover:shadow-md"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-700">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
        >
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </Link>
  )
}

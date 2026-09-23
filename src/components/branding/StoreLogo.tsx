import type { ReactNode } from 'react'

export function StoreLogo({
  logoUrl,
  size = 'md',
  fallback,
  className = '',
}: {
  logoUrl: string | null
  size?: 'sm' | 'md' | 'lg'
  fallback?: ReactNode
  className?: string
}) {
  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 rounded-xl'
      : size === 'lg'
        ? 'h-16 w-16 rounded-[1.35rem]'
        : 'h-11 w-11 rounded-2xl'

  if (logoUrl) {
    return (
      <span
        className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden border border-white/70 bg-white shadow-[0_10px_28px_rgba(15,23,42,.13)] ${className}`}
      >
        <img
          src={logoUrl}
          alt="Store logo"
          className="block h-full w-full object-contain object-center p-1.5"
        />
      </span>
    )
  }

  return (
    <span
      className={`${sizeClass} grid shrink-0 place-items-center bg-[linear-gradient(145deg,#2563eb,#6d5dfc)] text-white shadow-[0_10px_28px_rgba(47,107,255,.28)] ring-1 ring-white/60 ${className}`}
    >
      {fallback ?? (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 8.5h10M7 12h10M9.5 15.5h5" strokeLinecap="round" />
          <rect x="4" y="3" width="16" height="18" rx="4" />
        </svg>
      )}
    </span>
  )
}

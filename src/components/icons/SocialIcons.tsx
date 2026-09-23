type IconProps = { className?: string }

export function FacebookIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M13.7 22v-8.9h3l.45-3.47H13.7V7.42c0-1 .28-1.69 1.72-1.69h1.84V2.62a24.7 24.7 0 0 0-2.68-.14c-2.65 0-4.47 1.62-4.47 4.59v2.56h-3v3.47h3V22h3.59Z" />
    </svg>
  )
}

export function ViberIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.7 4.5C17.8 2.7 15.2 2 12 2 6.1 2 3 5.3 3 10.5c0 3.1 1.1 5.4 3.3 7L5.5 22l4.1-2.3c.8.2 1.6.3 2.4.3 5.9 0 9-3.3 9-8.5 0-3-.4-5.2-1.3-7Z" />
      <path d="M9 7.5c.4 3.4 2.1 5.3 5.5 6.5l1.1-1.5-2-1.2-.8 1c-1.2-.6-2.1-1.5-2.7-2.7l1-1-1.2-2L9 7.5Z" />
      <path d="M14.7 6.1c1.7.5 2.7 1.5 3.1 3.2M14.4 8.1c.8.2 1.2.7 1.4 1.5" />
    </svg>
  )
}


export function TelegramIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M21.7 3.3a1.4 1.4 0 0 0-1.5-.2L2.8 10.3a1.4 1.4 0 0 0 .2 2.7l4.4 1.3 1.5 4.8a1.4 1.4 0 0 0 2.4.5l2.5-2.7 4.2 3.1a1.4 1.4 0 0 0 2.2-.9l2.3-14.3a1.4 1.4 0 0 0-.8-1.5ZM9.3 13.6l8.3-6.2-6.8 7.4-.3 2.3-1.2-3.5Z" />
    </svg>
  )
}

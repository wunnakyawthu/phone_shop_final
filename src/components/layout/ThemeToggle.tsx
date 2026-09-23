import { useEffect, useState } from 'react'

const key = 'retail-hub-theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(
    () =>
      localStorage.getItem(key) === 'dark' ||
      (!localStorage.getItem(key) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(key, dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Appearance
      </span>
      <button
        type="button"
        onClick={() => setDark((value) => !value)}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm"
      >
        <span>{dark ? '☀' : '☾'}</span>
        {dark ? 'Light' : 'Dark'}
      </button>
    </div>
  )
}

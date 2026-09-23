import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase/client'

export function ContactPicker({
  kind,
  name,
  phone,
  onChange,
  placeholder,
  className = 'premium-input',
}: {
  kind: 'customer' | 'supplier'
  name: string
  phone: string
  onChange: (value: { id?: string; name: string; phone: string }) => void
  placeholder: string
  className?: string
}) {
  const [contacts, setContacts] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void (supabase as any)
      .from('contacts')
      .select('id,full_name,phone_number')
      .in('contact_type', [kind === 'customer' ? 'customer' : 'seller', 'both'])
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }: any) => setContacts(data ?? []))
  }, [kind])

  const matches = useMemo(() => {
    const query = `${name} ${phone}`.trim().toLowerCase()
    if (!query) return contacts.slice(0, 8)
    return contacts.filter((item) =>
      `${item.full_name} ${item.phone_number}`.toLowerCase().includes(query),
    ).slice(0, 8)
  }, [contacts, name, phone])

  return (
    <div className="relative">
      <input
        value={name}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 160)}
        onChange={(event) => {
          onChange({ id: undefined, name: event.target.value, phone })
          setOpen(true)
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+.4rem)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Saved {kind}s</p>
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange({ id: item.id, name: item.full_name, phone: item.phone_number })
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50"
            >
              <span className="truncate text-sm font-semibold text-slate-900">{item.full_name}</span>
              <span className="shrink-0 text-xs text-slate-500">{item.phone_number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { AppRole } from '../../types/app'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'

type StaffRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
  role: AppRole
}

const field =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'

async function functionErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as {
        error?: string
        message?: string
      }
      return payload.error || payload.message || fallback
    } catch {
      try {
        return (await context.clone().text()) || fallback
      } catch {
        return fallback
      }
    }
  }
  return error instanceof Error ? error.message : fallback
}

export function StaffManagement() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<StaffRow[]>([])
  const [editing, setEditing] = useState<StaffRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<AppRole>('phone_staff')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error: loadError } = await (supabase as any).rpc('list_managed_staff')
    if (loadError) throw loadError
    setRows(data ?? [])
  }, [])

  useEffect(() => {
    void load().catch((e) => setError(e.message))
  }, [load])

  function reset() {
    setCreating(false)
    setEditing(null)
    setFullName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setShowPassword(false)
    setRole('phone_staff')
    setError(null)
  }

  function edit(row: StaffRow) {
    setEditing(row)
    setCreating(false)
    setFullName(row.full_name)
    setEmail(row.email ?? '')
    setPhone(row.phone ?? '')
    setPassword('')
    setRole(row.role)
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      let userId = editing?.id
      if (!userId) {
        const { data, error: createError } = await supabase.functions.invoke(
          'admin-staff',
          {
            body: {
              email: email.trim(),
              password,
              fullName: fullName.trim(),
              phone: phone.trim(),
              role,
            },
          },
        )
        if (createError)
          throw new Error(
            await functionErrorMessage(createError, 'Could not create staff account.'),
          )
        userId = data?.id
        if (!userId) throw new Error('The staff account could not be created.')
      } else {
        const { error: saveError } = await (supabase as any).rpc('manage_staff_profile', {
          p_user_id: userId,
          p_full_name: fullName,
          p_phone: phone,
          p_role: role,
          p_is_active: editing?.is_active ?? true,
        })
        if (saveError) throw saveError
      }
      setMessage(
        editing
          ? 'Staff account updated.'
          : 'Staff account created. Email confirmation may be required before first login.',
      )
      reset()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save staff account.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(row: StaffRow) {
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    try {
      const { error: updateError } = await (supabase as any).rpc('manage_staff_profile', {
        p_user_id: row.id,
        p_full_name: row.full_name,
        p_phone: row.phone ?? '',
        p_role: row.role,
        p_is_active: !row.is_active,
      })
      if (updateError) throw updateError
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update staff.')
    } finally {
      setBusy(false)
    }
  }

  async function removeStaff() {
    if (!supabase || !deleteTarget || busy) return
    setBusy(true)
    setError(null)
    try {
      const { error: deleteError } = await supabase.functions.invoke('admin-staff', {
        body: { action: 'delete', userId: deleteTarget.id },
      })
      if (deleteError)
        throw new Error(
          await functionErrorMessage(deleteError, 'Could not delete staff account.'),
        )
      setDeleteTarget(null)
      setMessage('Staff account permanently deleted. Voucher snapshots are preserved.')
      await load()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not delete staff account.',
      )
    } finally {
      setBusy(false)
    }
  }

  const roleOptions: AppRole[] =
    profile?.role === 'owner'
      ? ['manager', 'phone_staff', 'computer_staff']
      : ['phone_staff', 'computer_staff']

  return (
    <section className="premium-form-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600">Access control</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Staff accounts & permissions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Phone staff see phone tools only. Computer staff see computer tools only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset()
            setCreating(true)
          }}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
        >
          + Add staff
        </button>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      <div className="mt-5 space-y-3">
        {rows.map((row) => {
          const manageable =
            profile?.role === 'owner' || !['owner', 'manager'].includes(row.role)
          return (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{row.full_name}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {row.email} · {row.role.replaceAll('_', ' ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!manageable}
                  onClick={() => edit(row)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={!manageable || row.id === profile?.id || busy}
                  onClick={() => void toggle(row)}
                  className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-40"
                >
                  {row.is_active ? 'Deactivate' : 'Activate'}
                </button>
                {profile?.role === 'owner' &&
                  row.id !== profile.id &&
                  row.role !== 'owner' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeleteTarget(row)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  )}
              </div>
            </div>
          )
        })}
      </div>
      {(creating || editing) && (
        <div
          className="fixed inset-0 z-[130] grid place-items-end bg-slate-950/50 p-3 backdrop-blur-sm sm:place-items-center"
          onMouseDown={() => !busy && reset()}
        >
          <form
            onSubmit={save}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h3 className="text-xl font-semibold">
              {editing ? 'Edit staff account' : 'Create staff account'}
            </h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className={field}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className={field}
              />
              <input
                required
                disabled={Boolean(editing)}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={field}
              />
              {!editing && (
                <div className="relative">
                  <input
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Temporary password"
                    className={`${field} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5 fill-none stroke-current"
                        strokeWidth="1.8"
                      >
                        <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.4A10.5 10.5 0 0 1 12 4c5.5 0 9 5 9 5a15.7 15.7 0 0 1-2.2 2.7M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5c1 0 1.9-.2 2.7-.4" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5 fill-none stroke-current"
                        strokeWidth="1.8"
                      >
                        <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className={`${field} sm:col-span-2`}
              >
                {roleOptions.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={reset}
                className="min-h-12 rounded-xl border border-slate-200 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="min-h-12 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save account'}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[140] grid place-items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:place-items-center"
          onMouseDown={() => !busy && setDeleteTarget(null)}
        >
          <section
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 font-bold text-red-700">
              !
            </span>
            <h3 className="mt-4 text-xl font-bold text-slate-950">
              Permanently delete {deleteTarget.full_name}?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This permanently removes the staff login, authentication user, profile and
              permissions. Existing vouchers keep only their saved staff-name snapshot.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="min-h-12 rounded-xl border border-slate-200 font-semibold"
              >
                Keep account
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeStaff()}
                className="min-h-12 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

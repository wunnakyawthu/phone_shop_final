import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'
import { getErrorMessage } from '../../lib/errors/app-error'
import { useTranslation } from 'react-i18next'

type DirectoryKind = 'customer' | 'supplier' // contact activity detail view
type ActivityData = {
  sales: any[]
  phonePurchases: any[]
  computerPurchases: any[]
}

const emptyActivity: ActivityData = { sales: [], phonePurchases: [], computerPurchases: [] }
const money = (value: number) => `${new Intl.NumberFormat('en-US').format(Math.round(value))} MMK`
const dateLabel = (value: string) => new Date(value).toLocaleDateString()
const normalizePhone = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '')

export function ContactsPage({ kind }: { kind: DirectoryKind }) {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<any[]>([])
  const [activity, setActivity] = useState<ActivityData>(emptyActivity)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)

  const loadDirectory = async () => {
    if (!supabase) return
    const { data, error: loadError } = await (supabase as any)
      .from('contacts')
      .select('id,full_name,phone_number,contact_type,notes,is_active,created_at')
      .in('contact_type', [kind === 'customer' ? 'customer' : 'seller', 'both'])
      .order('created_at', { ascending: false })
    if (loadError) throw loadError
    setContacts(data ?? [])
  }

  function openForm(contact?: any) {
    setEditing(contact ?? null)
    setName(contact?.full_name ?? '')
    setPhone(contact?.phone_number ?? '')
    setNotes(contact?.notes ?? '')
    setFormOpen(true)
    setError(null)
  }

  async function saveContact(event: FormEvent) {
    event.preventDefault()
    if (!supabase || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        full_name: name.trim(),
        phone_number: phone.trim(),
        notes: notes.trim() || null,
        contact_type: kind === 'customer' ? 'customer' : 'seller',
        is_active: true,
      }
      const query = editing
        ? (supabase as any).from('contacts').update(payload).eq('id', editing.id)
        : (supabase as any).from('contacts').insert(payload)
      const { error: saveError } = await query
      if (saveError) throw saveError
      setFormOpen(false)
      await loadDirectory()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save contact.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleContact(contact: any) {
    if (!supabase) return
    const { error: updateError } = await (supabase as any)
      .from('contacts')
      .update({ is_active: !contact.is_active })
      .eq('id', contact.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await loadDirectory()
  }

  async function permanentlyDeleteContact() {
    if (!supabase || !deleting || deleteBusy) return
    setDeleteBusy(true)
    setError(null)
    try {
      const { error: deleteError } = await (supabase as any).rpc(
        'permanently_delete_contact',
        { p_contact_id: deleting.id },
      )
      if (deleteError) throw deleteError
      setDeleting(null)
      await loadDirectory()
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setDeleteBusy(false)
    }
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    setLoading(true)
    setError(null)
    const client = supabase as any
    const contactQuery = client
      .from('contacts')
      .select('id,full_name,phone_number,contact_type,notes,is_active,created_at')
      .in('contact_type', [kind === 'customer' ? 'customer' : 'seller', 'both'])
      .order('created_at', { ascending: false })
    const salesQuery = kind === 'customer'
      ? client
          .from('pos_sales')
          .select('id,customer_contact_id,customer_phone_snapshot,invoice_number,sale_date,net_total_mmk,voided_at,pos_sale_items(id,category_snapshot,product_name_snapshot,serial_snapshot,net_price_mmk,is_voided)')
          .is('voided_at', null)
          .order('sale_date', { ascending: false })
      : Promise.resolve({ data: [], error: null })
    const phonePurchaseQuery = kind === 'supplier'
      ? client
          .from('purchases')
          .select('id,purchase_number,purchase_date,seller_contact_id,seller_name_snapshot,seller_phone_snapshot,status,purchase_items(id,purchase_price_mmk,device_units(imei_1,serial_number,product_models(name,brands(name))))')
          .eq('status', 'completed')
          .order('purchase_date', { ascending: false })
      : Promise.resolve({ data: [], error: null })
    const computerPurchaseQuery = kind === 'supplier'
      ? client
          .from('computer_inventory_items')
          .select('id,purchase_number,purchase_date,brand,model_name,serial_number,purchase_price,purchase_from,seller_phone,is_deleted')
          .order('purchase_date', { ascending: false })
      : Promise.resolve({ data: [], error: null })

    void Promise.all([contactQuery, salesQuery, phonePurchaseQuery, computerPurchaseQuery])
      .then(([contactResult, salesResult, phoneResult, computerResult]) => {
        for (const result of [contactResult, salesResult, phoneResult, computerResult]) {
          if (result.error) throw result.error
        }
        if (!active) return
        setContacts(contactResult.data ?? [])
        setActivity({
          sales: salesResult.data ?? [],
          phonePurchases: phoneResult.data ?? [],
          computerPurchases: computerResult.data ?? [],
        })
      })
      .catch((caught) => {
        if (active) setError(getErrorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [kind])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contacts.filter((contact) =>
      !query || `${contact.full_name} ${contact.phone_number}`.toLowerCase().includes(query),
    )
  }, [contacts, search])

  function historyFor(contact: any) {
    if (kind === 'customer') {
      const contactPhone = normalizePhone(contact.phone_number)
      return activity.sales
        .filter((sale) => !sale.voided_at && (
          sale.customer_contact_id === contact.id ||
          (!sale.customer_contact_id && contactPhone && normalizePhone(sale.customer_phone_snapshot) === contactPhone)
        ))
        .flatMap((sale) => (sale.pos_sale_items ?? [])
          .filter((item: any) => !item.is_voided)
          .map((item: any) => ({
            id: `${sale.id}:${item.id}`,
            date: sale.sale_date,
            reference: sale.invoice_number,
            product: item.product_name_snapshot || (item.category_snapshot === 'phone' ? 'Phone' : 'Computer'),
            identifier: item.serial_snapshot,
            amount: Number(item.net_price_mmk ?? 0),
          })))
    }

    const contactPhone = normalizePhone(contact.phone_number)
    const supplierName = contact.full_name.trim().toLowerCase()
    const phoneRows = activity.phonePurchases
      .filter((purchase) => purchase.seller_contact_id === contact.id || (
        !purchase.seller_contact_id && (
          (contactPhone && normalizePhone(purchase.seller_phone_snapshot) === contactPhone) ||
          (!purchase.seller_phone_snapshot && (purchase.seller_name_snapshot ?? '').trim().toLowerCase() === supplierName)
        )
      ))
      .flatMap((purchase) => (purchase.purchase_items ?? []).map((item: any) => {
        const device = item.device_units
        const model = device?.product_models
        const brand = model?.brands?.name
        return {
          id: `${purchase.id}:${item.id}`,
          date: purchase.purchase_date,
          reference: purchase.purchase_number,
          product: [brand, model?.name].filter(Boolean).join(' ') || 'Phone',
          identifier: device?.imei_1 || device?.serial_number,
          amount: Number(item.purchase_price_mmk ?? 0),
        }
      }))
    const phone = contactPhone
    const computerRows = activity.computerPurchases
      .filter((purchase) => {
        const purchasePhone = normalizePhone(purchase.seller_phone)
        if (phone && purchasePhone) return phone === purchasePhone
        return !purchasePhone && (purchase.purchase_from ?? '').trim().toLowerCase() === supplierName
      })
      .map((purchase) => ({
        id: purchase.id,
        date: purchase.purchase_date,
        reference: purchase.purchase_number,
        product: [purchase.brand, purchase.model_name].filter(Boolean).join(' ') || 'Computer',
        identifier: purchase.serial_number,
        amount: Number(purchase.purchase_price ?? 0),
      }))
    return [...phoneRows, ...computerRows].sort((a, b) => b.date.localeCompare(a.date))
  }

  const title = kind === 'customer' ? t('contacts.customers') : t('contacts.suppliers')
  return (
    <section className="pb-10">
      <div className="management-page-hero">
        <div>
          <p className="management-eyebrow">{t('contacts.directory')}</p>
          <h1 className="management-title">{title}</h1>
          <p className="management-subtitle">{t(kind === 'customer' ? 'contacts.customerSubtitle' : 'contacts.supplierSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{contacts.length}</span>
          <button type="button" onClick={() => openForm()} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">+ {t(kind === 'customer' ? 'contacts.addCustomer' : 'contacts.addSupplier')}</button>
        </div>
      </div>
      <div className="premium-form-card mt-5">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t(kind === 'customer' ? 'contacts.searchCustomer' : 'contacts.searchSupplier')} className="premium-input w-full rounded-2xl border border-slate-200 px-4 py-3" />
      </div>
      {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
      {loading ? <div className="mt-5 h-64 animate-pulse rounded-3xl bg-white" /> : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((contact) => {
            const history = historyFor(contact)
            const total = history.reduce((sum, row) => sum + row.amount, 0)
            const transactionCount = new Set(history.map((row) => row.reference)).size
            const expanded = expandedContact === contact.id
            return (
              <article key={contact.id} className="premium-form-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-950">{contact.full_name}</h2>
                    <a href={`tel:${contact.phone_number}`} className="mt-1 block text-sm text-blue-600">{contact.phone_number}</a>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${contact.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{contact.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                  <div><p className="text-[10px] uppercase text-slate-400">{kind === 'customer' ? 'Items bought' : 'Items supplied'}</p><p className="mt-1 font-semibold">{history.length} <span className="text-xs font-normal text-slate-500">· {transactionCount} {kind === 'customer' ? 'sales' : 'purchases'}</span></p></div>
                  <div><p className="text-[10px] uppercase text-slate-400">Total value</p><p className="mt-1 font-semibold">{money(total)}</p></div>
                </div>
                <button type="button" onClick={() => setExpandedContact(expanded ? null : contact.id)} aria-expanded={expanded} className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700">
                  {expanded ? 'Hide purchase history' : kind === 'customer' ? 'View items bought' : 'View items supplied'}
                </button>
                {expanded && (
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                    {!history.length ? <p className="py-5 text-center text-sm text-slate-500">No linked transactions found.</p> : history.map((row) => (
                      <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{row.product}</p>
                            {row.identifier && <p className="mt-0.5 break-all text-xs text-slate-500">IMEI / Serial: {row.identifier}</p>}
                            <p className="mt-1 text-xs text-slate-500">{row.reference} · {dateLabel(row.date)}</p>
                          </div>
                          <span className="shrink-0 text-right text-sm font-semibold">{money(row.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openForm(contact)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">Edit</button>
                  <button type="button" onClick={() => void toggleContact(contact)} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">{contact.is_active ? 'Deactivate' : 'Restore'}</button>
                  {(profile?.role === 'owner' || profile?.role === 'manager') && <button type="button" onClick={() => setDeleting(contact)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete permanently</button>}
                </div>
              </article>
            )
          })}
          {!filtered.length && <p className="col-span-full rounded-3xl bg-white p-10 text-center text-slate-500">No matching {kind}s.</p>}
        </div>
      )}
      {formOpen && <div className="fixed inset-0 z-[130] grid place-items-end bg-slate-950/50 p-3 backdrop-blur-sm sm:place-items-center" onMouseDown={() => !saving && setFormOpen(false)}><form onSubmit={saveContact} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">{editing ? 'Edit' : 'Add'} {kind}</h2><div className="mt-5 space-y-3"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="premium-input w-full"/><input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" className="premium-input w-full"/><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" rows={3} className="premium-input w-full resize-none"/></div><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setFormOpen(false)} className="min-h-12 rounded-xl border border-slate-200 font-semibold">Cancel</button><button disabled={saving} className="min-h-12 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button></div></form></div>}
      {deleting && <div className="fixed inset-0 z-[140] grid place-items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:place-items-center" onMouseDown={() => !deleteBusy && setDeleting(null)}><section onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-xl text-red-700">!</span><h2 className="mt-4 text-xl font-bold text-slate-950">Delete {deleting.full_name} permanently?</h2><p className="mt-2 text-sm leading-6 text-slate-500">This contact will be removed from the directory. Existing purchase and voucher snapshots will remain unchanged.</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={deleteBusy} onClick={() => setDeleting(null)} className="min-h-12 rounded-xl border border-slate-200 font-semibold">Keep contact</button><button type="button" disabled={deleteBusy} onClick={() => void permanentlyDeleteContact()} className="min-h-12 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-50">{deleteBusy ? 'Deleting…' : 'Delete permanently'}</button></div></section></div>}
    </section>
  )
}

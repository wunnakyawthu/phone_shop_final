import { useEffect, useState } from 'react'
import { BackLink } from '../../components/navigation/BackLink'

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { cleanupUploadedPhotos } from '../purchases/devicePhotoUpload'
import {
  loadDeletedPhoneInventory,
  permanentlyDeletePhoneInventoryItem,
  restoreDeletedPhoneInventoryItem,
} from './phoneInventoryApi'
import type { DeletedPhoneInventoryItem } from './phoneInventoryTypes'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

type PendingAction =
  | { type: 'restore'; item: DeletedPhoneInventoryItem }
  | { type: 'permanent-delete'; item: DeletedPhoneInventoryItem }
  | null

export function PhoneDeleteHistoryPage() {
  const [items, setItems] = useState<DeletedPhoneInventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isWorking, setIsWorking] = useState(false)

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      setItems(await loadDeletedPhoneInventory())
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Failed to load Delete History.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleRestore() {
    if (!pendingAction || pendingAction.type !== 'restore' || isWorking) return
    const item = pendingAction.item
    setIsWorking(true)
    setError(null)

    try {
      await restoreDeletedPhoneInventoryItem(item.historyId)
      setItems((current) => current.filter((entry) => entry.historyId !== item.historyId))
      setPendingAction(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to restore phone.')
      setPendingAction(null)
    } finally {
      setIsWorking(false)
    }
  }

  async function handlePermanentDelete() {
    if (!pendingAction || pendingAction.type !== 'permanent-delete' || isWorking) return
    const item = pendingAction.item
    setIsWorking(true)
    setError(null)

    try {
      const photoPaths = await permanentlyDeletePhoneInventoryItem(item.historyId)
      await cleanupUploadedPhotos(photoPaths)
      setItems((current) => current.filter((entry) => entry.historyId !== item.historyId))
      setPendingAction(null)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Failed to permanently delete phone.',
      )
      setPendingAction(null)
    } finally {
      setIsWorking(false)
    }
  }

  const restoring = pendingAction?.type === 'restore'

  return (
    <section className="pb-8">
      <div className="management-page-hero">
        <div>
          <BackLink to="/app/phones">Phone Inventory</BackLink>
          <p className="management-eyebrow mt-5">Inventory safety</p>
          <h1 className="management-title">Delete History</h1>
          <p className="management-subtitle">
            Deleted phones stay here first. Restore returns a phone to In Stock; permanent
            delete removes its stored data after a second confirmation.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((value) => (
            <div key={value} className="h-44 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-900">Delete History is empty</p>
          <p className="mt-2 text-sm text-slate-500">
            Incorrect registrations moved out of inventory will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article
              key={item.historyId}
              className="rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                {item.photoUrls[0] ? (
                  <img
                    src={item.photoUrls[0]}
                    alt={`${item.brandName} ${item.modelName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xs font-bold text-slate-400">
                    No photo
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
                  {item.brandName}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  {item.modelName}
                </h2>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">
                  {item.identifier ?? 'No identifier'}
                </p>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <p>
                  <span className="font-bold text-slate-700">Deleted:</span>{' '}
                  {formatDate(item.deletedAt)}
                </p>
                <p>
                  <span className="font-bold text-slate-700">By:</span>{' '}
                  {item.deletedByName ?? 'Unknown user'}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: 'restore', item })}
                  className="min-h-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  ↶ Restore
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: 'permanent-delete', item })}
                  className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  Delete forever
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          restoring ? 'Restore this phone to In Stock?' : 'Permanently delete this phone?'
        }
        description={
          restoring
            ? 'This phone will leave Delete History and return to Phone Inventory as In Stock. Its previous public website visibility will also be restored.'
            : 'This is the final delete. The phone registration and its related purchase/inventory records will be removed from the database, and its stored photos will be deleted. This cannot be undone.'
        }
        confirmLabel={
          isWorking
            ? restoring
              ? 'Restoring…'
              : 'Deleting…'
            : restoring
              ? 'Yes, restore to In Stock'
              : 'Yes, permanently delete'
        }
        onCancel={() => !isWorking && setPendingAction(null)}
        onConfirm={() => {
          if (restoring) void handleRestore()
          else void handlePermanentDelete()
        }}
      />
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { BackLink } from '../../../components/navigation/BackLink'

import { ConfirmDialog } from '../../../components/feedback/ConfirmDialog'
import { supabase } from '../../../lib/supabase/client'
import { getComputerPhotoUrl } from '../purchases/computerPhotoUpload'

type DeletedComputerItem = {
  history_id: string
  computer_id: string
  brand: string | null
  model_name: string | null
  serial_number: string | null
  computer_type: string | null
  condition: string | null
  deleted_by_name: string | null
  deleted_at: string
  snapshot: unknown
  cover_photo_path: string | null
}

type ComputerPhotoRow = {
  computer_id: string
  storage_path: string
  sort_order: number
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ComputerDeleteHistoryPage() {
  const [items, setItems] = useState<DeletedComputerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [restoreItem, setRestoreItem] = useState<DeletedComputerItem | null>(null)

  const [permanentDeleteItem, setPermanentDeleteItem] =
    useState<DeletedComputerItem | null>(null)

  const [isRestoring, setIsRestoring] = useState(false)
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Supabase client is not configured.')
      setLoading(false)
      return
    }

    const client = supabase

    try {
      setErrorMessage('')

      const { data, error } = await client.rpc('get_deleted_computer_inventory')

      if (error) {
        throw error
      }

      const history = data ?? []
      const computerIds = history.map((item) => item.computer_id)

      let photoRows: ComputerPhotoRow[] = []

      if (computerIds.length > 0) {
        const { data: photos, error: photoError } = await client
          .from('computer_inventory_photos')
          .select('computer_id, storage_path, sort_order')
          .in('computer_id', computerIds)
          .order('sort_order', { ascending: true })

        if (photoError) {
          throw photoError
        }

        photoRows = (photos ?? []) as ComputerPhotoRow[]
      }

      const coverByComputerId = new Map<string, string>()

      for (const photo of photoRows) {
        if (!coverByComputerId.has(photo.computer_id)) {
          coverByComputerId.set(photo.computer_id, photo.storage_path)
        }
      }

      setItems(
        history.map((item) => ({
          ...item,
          cover_photo_path: coverByComputerId.get(item.computer_id) ?? null,
        })) as DeletedComputerItem[],
      )
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load Computer Delete History.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  async function handleRestore() {
    if (!restoreItem || !supabase || isRestoring) {
      return
    }

    try {
      setIsRestoring(true)
      setErrorMessage('')

      const { error } = await supabase.rpc('restore_deleted_computer_inventory_item', {
        p_history_id: restoreItem.history_id,
      })

      if (error) {
        throw error
      }

      setRestoreItem(null)
      await loadHistory()
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to restore computer.',
      )

      setRestoreItem(null)
    } finally {
      setIsRestoring(false)
    }
  }

  async function handlePermanentDelete() {
    if (!permanentDeleteItem || !supabase || isPermanentlyDeleting) {
      return
    }

    try {
      setIsPermanentlyDeleting(true)
      setErrorMessage('')

      const { data: photoPaths, error } = await supabase.rpc(
        'permanently_delete_computer_inventory_item_with_photos',
        {
          p_history_id: permanentDeleteItem.history_id,
        },
      )

      if (error) {
        throw error
      }

      let storageWarning = ''

      if (photoPaths?.length) {
        const { error: storageError } = await supabase.storage
          .from('device-images')
          .remove(photoPaths)

        if (storageError) {
          console.error(storageError)
          storageWarning =
            ' Computer data was deleted, but some stored photo files could not be removed.'
        }
      }

      setPermanentDeleteItem(null)
      await loadHistory()

      if (storageWarning) {
        setErrorMessage(storageWarning.trim())
      }
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to permanently delete computer.',
      )

      setPermanentDeleteItem(null)
    } finally {
      setIsPermanentlyDeleting(false)
    }
  }

  if (loading) {
    return <div className="h-72 animate-pulse rounded-3xl bg-white shadow-sm" />
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="management-page-hero">
        <div>
          <BackLink to="/app/computers">Computer Inventory</BackLink>
          <p className="management-eyebrow mt-5">Inventory safety</p>
          <h1 className="management-title">Delete History</h1>
          <p className="management-subtitle">
            Deleted computers stay here first. Restore returns a computer to In Stock;
            permanent delete removes its stored data after a second confirmation.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      {items.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Delete History is empty</h2>

          <p className="mt-2 text-sm text-slate-500">
            Deleted computers will appear here.
          </p>

          <div className="mt-5 flex justify-center">
            <BackLink to="/app/computers">Back to Inventory</BackLink>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const photoUrl = item.cover_photo_path
              ? getComputerPhotoUrl(item.cover_photo_path)
              : null

            return (
              <article
                key={item.history_id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${item.model_name || 'Computer'} deleted inventory`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-center">
                      <div>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
                          🖥️
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-700">No photo</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-1 pb-1 pt-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
                    {item.brand || 'Unknown Brand'}
                  </p>

                  <h2 className="mt-1 break-words text-xl font-bold text-slate-950">
                    {item.model_name || 'Unknown Model'}
                  </h2>

                  <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-500">
                    {item.serial_number || 'No Serial Number'}
                  </p>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">
                      <span className="font-bold text-slate-800">Deleted:</span>{' '}
                      {formatDate(item.deleted_at)}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-bold text-slate-800">By:</span>{' '}
                      {item.deleted_by_name || 'Unknown'}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isRestoring || isPermanentlyDeleting}
                      onClick={() => setRestoreItem(item)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ↶ Restore
                    </button>

                    <button
                      type="button"
                      disabled={isRestoring || isPermanentlyDeleting}
                      onClick={() => setPermanentDeleteItem(item)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete forever
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={restoreItem !== null}
        title="Restore this computer?"
        description={
          restoreItem
            ? `${restoreItem.brand ? `${restoreItem.brand} ` : ''}${
                restoreItem.model_name || 'This computer'
              } will return to active Computer Inventory.`
            : ''
        }
        confirmLabel={isRestoring ? 'Restoring...' : 'Restore Computer'}
        onCancel={() => {
          if (!isRestoring) {
            setRestoreItem(null)
          }
        }}
        onConfirm={() => {
          void handleRestore()
        }}
      />

      <ConfirmDialog
        open={permanentDeleteItem !== null}
        title="Permanently delete this computer?"
        description={
          permanentDeleteItem
            ? `${permanentDeleteItem.brand ? `${permanentDeleteItem.brand} ` : ''}${
                permanentDeleteItem.model_name || 'This computer'
              } will be permanently removed, including its saved product photos. This action cannot be undone.`
            : ''
        }
        confirmLabel={isPermanentlyDeleting ? 'Deleting...' : 'Delete forever'}
        onCancel={() => {
          if (!isPermanentlyDeleting) {
            setPermanentDeleteItem(null)
          }
        }}
        onConfirm={() => {
          void handlePermanentDelete()
        }}
      />
    </div>
  )
}

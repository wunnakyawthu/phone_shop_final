import { createClientId } from '../../lib/id'
import { supabase } from '../../lib/supabase/client'

const BUCKET = 'device-images'

export const DEVICE_PHOTO_MIN_COUNT = 2
export const DEVICE_PHOTO_MAX_COUNT = 6
export const DEVICE_PHOTO_MAX_ORIGINAL_BYTES = 8 * 1024 * 1024
export const DEVICE_PHOTO_MAX_EDGE = 1600
export const DEVICE_PHOTO_TARGET_BYTES = 800 * 1024

const START_WEBP_QUALITY = 0.82
const MIN_WEBP_QUALITY = 0.45
const QUALITY_STEP = 0.08
const SCALE_STEP = 0.85
const MIN_EDGE = 720
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export function validateOriginalPhoto(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${file.name}: Only JPEG, PNG or WebP images are allowed.`
  }

  if (file.size > DEVICE_PHOTO_MAX_ORIGINAL_BYTES) {
    return `${file.name}: Original image must be 8 MB or smaller.`
  }

  return null
}

async function fileToImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error(`Could not read image: ${file.name}`))
      image.src = url
    })
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image.'))),
      'image/webp',
      quality,
    )
  })
}

async function compressToWebp(file: File): Promise<Blob> {
  const validationError = validateOriginalPhoto(file)
  if (validationError) throw new Error(validationError)

  const image = await fileToImage(file)
  const originalMaxEdge = Math.max(image.naturalWidth, image.naturalHeight)
  let maxEdge = Math.min(DEVICE_PHOTO_MAX_EDGE, originalMaxEdge)

  while (true) {
    const scale = Math.min(1, maxEdge / originalMaxEdge)
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is not available in this browser.')

    context.drawImage(image, 0, 0, width, height)

    for (
      let quality = START_WEBP_QUALITY;
      quality >= MIN_WEBP_QUALITY;
      quality -= QUALITY_STEP
    ) {
      const blob = await canvasToWebp(canvas, quality)
      if (blob.size <= DEVICE_PHOTO_TARGET_BYTES) return blob
    }

    if (maxEdge <= MIN_EDGE) break
    maxEdge = Math.max(MIN_EDGE, Math.round(maxEdge * SCALE_STEP))
  }

  throw new Error(
    `${file.name}: Could not compress this image below 800 KB. Please choose a smaller image.`,
  )
}

export async function uploadPurchasePhotos(
  userId: string,
  photosByItem: Record<string, File[]>,
): Promise<{ pathsByItem: Record<string, string[]>; allPaths: string[] }> {
  const client = requireSupabase()
  const pathsByItem: Record<string, string[]> = {}
  const allPaths: string[] = []

  try {
    for (const [itemId, files] of Object.entries(photosByItem)) {
      if (files.length > DEVICE_PHOTO_MAX_COUNT) {
        throw new Error(`Each device can have at most ${DEVICE_PHOTO_MAX_COUNT} photos.`)
      }

      const paths: string[] = []

      for (const file of files) {
        const blob = await compressToWebp(file)
        const path = `phone/${userId}/${createClientId()}.webp`
        const { error } = await client.storage.from(BUCKET).upload(path, blob, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        })
        if (error) throw new Error(error.message)
        paths.push(path)
        allPaths.push(path)
      }

      pathsByItem[itemId] = paths
    }

    return { pathsByItem, allPaths }
  } catch (error) {
    if (allPaths.length) {
      await client.storage.from(BUCKET).remove(allPaths)
    }
    throw error
  }
}

export async function cleanupUploadedPhotos(paths: string[]) {
  if (!paths.length) return
  const client = requireSupabase()
  await client.storage.from(BUCKET).remove(paths)
}

export function getDevicePhotoUrl(path: string) {
  const client = requireSupabase()
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadAdditionalDevicePhotos(
  userId: string,
  deviceId: string,
  files: File[],
): Promise<string[]> {
  if (!files.length) return []
  const client = requireSupabase()
  const uploaded: string[] = []

  try {
    for (const file of files) {
      const blob = await compressToWebp(file)
      const path = `phone/${userId}/edits/${deviceId}/${createClientId()}.webp`
      const { error } = await client.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      })
      if (error) throw new Error(error.message)
      uploaded.push(path)
    }
    return uploaded
  } catch (error) {
    if (uploaded.length) await client.storage.from(BUCKET).remove(uploaded)
    throw error
  }
}

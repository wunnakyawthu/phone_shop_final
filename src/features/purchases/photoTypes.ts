export interface SelectedDevicePhoto {
  id: string
  file: File
  previewUrl: string
}

export type PhonePurchasePhotoMap = Record<string, File[]>

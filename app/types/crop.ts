export interface CropRequest {
  imageData: ImageData
  width: number
  height: number
}

export interface CropResult {
  success: boolean
  reason: string // 'success' | 'no_contour' | 'too_small' | 'not_centered' | 'low_solidity' | 'timeout' | 'wasm_error'
  bounds?: { x: number; y: number; width: number; height: number }
  rotationAngle?: number
  processingTime: number
  errorMessage?: string
}

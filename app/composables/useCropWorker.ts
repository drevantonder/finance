interface CropRequest {
  imageData: ImageData
  width: number
  height: number
}

interface CropResult {
  success: boolean
  reason: 'success' | 'no_contour' | 'too_small' | 'not_centered' | 'low_solidity' | 'timeout' | 'wasm_error'
  bounds?: { x: number; y: number; width: number; height: number }
  rotationAngle?: number
  processingTime: number
}

let worker: Worker | null = null
let idleTimeout: ReturnType<typeof setTimeout> | null = null
const IDLE_TIMEOUT_MS = 30000

export function useCropWorker() {
  const initWorker = () => {
    if (worker) return

    worker = new Worker(new URL('../workers/cropWorker.worker.ts', import.meta.url))

    worker.addEventListener('error', (err) => {
      console.error('[CropWorker] Worker error:', err)
    })
  }

  const resetIdleTimer = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout)
    }
    idleTimeout = setTimeout(() => {
      terminateWorker()
    }, IDLE_TIMEOUT_MS)
  }

  const terminateWorker = () => {
    if (worker) {
      worker.terminate()
      worker = null
    }
    if (idleTimeout) {
      clearTimeout(idleTimeout)
      idleTimeout = null
    }
  }

  const crop = async (imageData: ImageData, width: number, height: number): Promise<CropResult> => {
    initWorker()

    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        worker!.removeEventListener('message', handler)
        resolve(e.data as CropResult)
        resetIdleTimer()
      }

      worker!.addEventListener('message', handler)
      worker!.postMessage({
        imageData,
        width,
        height
      } as CropRequest, [imageData.data.buffer])
    })
  }

  const terminate = () => {
    terminateWorker()
  }

  return {
    crop,
    terminate
  }
}

export type { CropRequest, CropResult }

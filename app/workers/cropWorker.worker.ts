interface CropRequest {
  imageData: ImageData
  width: number
  height: number
}

interface CropResult {
  success: boolean
  reason: string
  bounds?: { x: number; y: number; width: number; height: number }
  rotationAngle?: number
  processingTime: number
  errorMessage?: string
}

let cvReady = false
const TIMEOUT_MS = 2000

async function initializeCv(): Promise<boolean> {
  if (cvReady) return true

  return new Promise<boolean>((resolve) => {
    (self as any).Module = {
      onRuntimeInitialized: () => {
        cvReady = true
        resolve(true)
      },
      onRuntimeInitializedError: () => {
        resolve(false)
      }
    }
    
    try {
      // @ts-ignore
      importScripts('/opencv/opencv.js')
    } catch (err: any) {
      console.error('importScripts failed:', err)
      resolve(false)
    }
  })
}

async function detectReceipt(imageData: ImageData, originalWidth: number, originalHeight: number): Promise<CropResult> {
  const startTime = performance.now()

  if (!cvReady) {
    const initialized = await initializeCv()
    if (!initialized) {
      return { success: false, reason: 'wasm_error', processingTime: 0, errorMessage: 'Failed to initialize OpenCV' }
    }
  }

  const cv = (self as any).cv
  try {
    const processingWidth = 500
    // ... rest of logic

      const scale = originalWidth / processingWidth
      const processingHeight = Math.round(originalHeight / scale)

      const src = cv.matFromImageData(imageData)
      const resized = new cv.Mat()
      const gray = new cv.Mat()
      const blurred = new cv.Mat()
      const thresh = new cv.Mat()
      const morphed = new cv.Mat()
      const hierarchy = new cv.Mat()
      const contours = new cv.MatVector()

      try {
        cv.resize(src, resized, new cv.Size(processingWidth, processingHeight), 0, 0, cv.INTER_LINEAR)
        cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY, 0)
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
        cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)

        const M = cv.Mat.ones(9, 9, cv.CV_8U)
        cv.morphologyEx(thresh, morphed, cv.MORPH_CLOSE, M, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())
        M.delete()

        cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        if (contours.size() === 0) {
          return { success: false, reason: 'no_contour', processingTime: performance.now() - startTime }
        }

        const totalPixels = processingWidth * processingHeight
        const minArea = totalPixels * 0.10
        const centerX = processingWidth / 2
        const centerTolerance = processingWidth * 0.25

        let bestContourIndex = -1
        let maxArea = 0

        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i)
          const area = cv.contourArea(contour)

          if (area < minArea) continue

          const M2 = cv.moments(contour)
          const cx = M2.m10 / M2.m00

          if (Math.abs(cx - centerX) > centerTolerance) continue

          const hull = new cv.Mat()
          cv.convexHull(contour, hull)
          const hullArea = cv.contourArea(hull)
          hull.delete()

          const solidity = hullArea > 0 ? area / hullArea : 0
          if (solidity < 0.7) continue

          if (area > maxArea) {
            maxArea = area
            bestContourIndex = i
          }
        }

        if (bestContourIndex === -1) {
          return { success: false, reason: 'no_contour', processingTime: performance.now() - startTime }
        }

        const bestContour = contours.get(bestContourIndex)
        const rect = cv.boundingRect(bestContour)

        const padding = 0.05
        const paddedX = Math.max(0, Math.round((rect.x - rect.width * padding) * scale))
        const paddedY = Math.max(0, Math.round((rect.y - rect.height * padding) * scale))
        const paddedWidth = Math.min(originalWidth - paddedX, Math.round((rect.width * (1 + 2 * padding)) * scale))
        const paddedHeight = Math.min(originalHeight - paddedY, Math.round((rect.height * (1 + 2 * padding)) * scale))

        const minRect = cv.minAreaRect(bestContour)
        const angle = minRect.angle

        return {
          success: true,
          reason: 'success',
          bounds: {
            x: paddedX,
            y: paddedY,
            width: paddedWidth,
            height: paddedHeight
          },
          rotationAngle: angle,
          processingTime: performance.now() - startTime
        }
      } finally {
        src.delete()
        resized.delete()
        gray.delete()
        blurred.delete()
        thresh.delete()
        morphed.delete()
        hierarchy.delete()
        contours.delete()
      }
    } catch (err) {
      console.error('[CropWorker] Detection error:', err)
      return { success: false, reason: 'wasm_error', processingTime: performance.now() - startTime }
    }
}

let currentTimeout: ReturnType<typeof setTimeout> | null = null

self.addEventListener('message', async (e) => {
  if (currentTimeout) {
    clearTimeout(currentTimeout)
  }

  const { imageData, width, height } = e.data as CropRequest

  const timeoutPromise = new Promise<CropResult>((resolve) => {
    currentTimeout = setTimeout(() => {
      resolve({ success: false, reason: 'timeout', processingTime: TIMEOUT_MS })
    }, TIMEOUT_MS)
  })

  const detectPromise = detectReceipt(imageData, width, height)

  try {
    const result = await Promise.race([timeoutPromise, detectPromise])
    self.postMessage(result)
  } catch (err) {
    self.postMessage({ success: false, reason: 'wasm_error' as const, processingTime: 0 })
  } finally {
    if (currentTimeout) {
      clearTimeout(currentTimeout)
      currentTimeout = null
    }
  }
})

import { ref } from 'vue'

export interface ProcessedFile {
  correlationId: string
  data: string           // Base64
  type: 'image' | 'pdf'
  hash: string           // SHA-256
  thumbnail: string      // 64x64 Base64 for UI
  originalName: string
  size: number
  capturedAt: string
  cropApplied: boolean
  cropReason?: string
  timing: Record<string, number>
}

export function useFileProcessor() {
  const MAX_SIZE = 1920
  const THUMBNAIL_SIZE = 64
  const QUALITY = 0.8

  async function generateHash(data: string): Promise<string> {
    const binaryData = atob(data.split(',')[1] || data)
    const bytes = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) bytes[i] = binaryData.charCodeAt(i)
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function resizeImage(dataUrl: string, maxDim: number, quality = QUALITY): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        
        if (width > height) {
          if (width > maxDim) {
            height = height * (maxDim / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = width * (maxDim / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to create canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        
        // Try WebP first, fallback to JPEG if unsupported
        let finalDataUrl = canvas.toDataURL('image/webp', quality)
        if (!finalDataUrl.startsWith('data:image/webp')) {
          console.warn('[FileProcessor] WebP encoding not supported, falling back to JPEG')
          finalDataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        
        resolve(finalDataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image for resizing'))
      img.src = dataUrl
    })
  }

  async function cropImage(dataUrl: string): Promise<{ dataUrl: string; applied: boolean; reason?: string }> {
    try {
      const { crop } = useCropWorker()

      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image for cropping'))
        img.src = dataUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to create canvas context')
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const result = await crop(imageData, img.width, img.height)

      if (result.success && result.bounds) {
        const croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = result.bounds.width
        croppedCanvas.height = result.bounds.height
        const croppedCtx = croppedCanvas.getContext('2d')
        if (!croppedCtx) throw new Error('Failed to create cropped canvas context')
        croppedCtx.drawImage(canvas, result.bounds.x, result.bounds.y, result.bounds.width, result.bounds.height, 0, 0, result.bounds.width, result.bounds.height)

        let finalDataUrl = croppedCanvas.toDataURL('image/webp', 0.8)
        if (!finalDataUrl.startsWith('data:image/webp')) {
          finalDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.8)
        }

        return { dataUrl: finalDataUrl, applied: true, reason: result.reason }
      } else {
        console.warn('[FileProcessor] Crop failed:', result.reason, `processingTime: ${result.processingTime}ms`)
        return { dataUrl, applied: false, reason: result.reason }
      }
    } catch (err) {
      console.error('[FileProcessor] Crop error:', err)
      return { dataUrl, applied: false, reason: 'crop_error' }
    }
  }

  async function processFile(file: File): Promise<ProcessedFile> {
    const correlationId = crypto.randomUUID()
    const timing: Record<string, number> = {}
    const startOverall = performance.now()

    return new Promise((resolve, reject) => {
      const capturedAt = file.lastModified 
        ? new Date(file.lastModified).toISOString() 
        : new Date().toISOString()

      const reader = new FileReader()
      const startRead = performance.now()
      
      reader.onload = async (e) => {
        timing.file_read = Math.round(performance.now() - startRead)
        const dataUrl = e.target?.result as string
        if (!dataUrl) {
          reject(new Error('Failed to read file'))
          return
        }

        try {
          const type = file.type === 'application/pdf' ? 'pdf' : 'image'
          
          const startHash = performance.now()
          const hash = await generateHash(dataUrl)
          timing.hash = Math.round(performance.now() - startHash)
          
          let finalData = dataUrl
          let thumbnail = ''
          let cropApplied = false
          let cropReason: string | undefined

          if (type === 'image') {
            const startCrop = performance.now()
            const cropResult = await cropImage(dataUrl)
            timing.crop = Math.round(performance.now() - startCrop)
            
            finalData = cropResult.dataUrl
            cropApplied = cropResult.applied
            cropReason = cropResult.reason
            
            const startResize = performance.now()
            finalData = await resizeImage(finalData, MAX_SIZE)
            timing.resize = Math.round(performance.now() - startResize)

            const startThumb = performance.now()
            thumbnail = await resizeImage(finalData, THUMBNAIL_SIZE, 0.6)
            timing.thumbnail = Math.round(performance.now() - startThumb)
          } else {
            thumbnail = '' 
          }

          timing.total_client = Math.round(performance.now() - startOverall)

          resolve({
            correlationId,
            data: finalData,
            type,
            hash,
            thumbnail,
            originalName: file.name,
            size: file.size,
            capturedAt,
            cropApplied,
            cropReason,
            timing
          })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('File read error'))
      reader.readAsDataURL(file)
    })
  }

  async function checkDuplicate(hash: string): Promise<boolean> {
    try {
      const { exists } = await $fetch<{ exists: boolean }>(`/api/expenses/check-hash?hash=${hash}`)
      return exists
    } catch (e) {
      console.warn('Hash check failed', e)
      return false
    }
  }

  return {
    processFile,
    generateHash,
    resizeImage,
    checkDuplicate
  }
}

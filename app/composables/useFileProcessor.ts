import { ref } from 'vue'

export interface ProcessedFile {
  data: string           // Base64
  type: 'image' | 'pdf'
  hash: string           // SHA-256
  thumbnail: string      // 64x64 Base64 for UI
  originalName: string
  size: number
  capturedAt: string
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
        
        // Try WebP first, fallback to JPEG
        let finalDataUrl = canvas.toDataURL('image/webp', quality)
        if (finalDataUrl.startsWith('data:image/png') || finalDataUrl.startsWith('data:image/octet-stream')) {
          finalDataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        
        resolve(finalDataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image for resizing'))
      img.src = dataUrl
    })
  }

  async function processFile(file: File): Promise<ProcessedFile> {
    return new Promise((resolve, reject) => {
      const capturedAt = file.lastModified 
        ? new Date(file.lastModified).toISOString() 
        : new Date().toISOString()

      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        if (!dataUrl) {
          reject(new Error('Failed to read file'))
          return
        }

        try {
          const type = file.type === 'application/pdf' ? 'pdf' : 'image'
          const hash = await generateHash(dataUrl)
          
          let finalData = dataUrl
          let thumbnail = ''

          if (type === 'image') {
            finalData = await resizeImage(dataUrl, MAX_SIZE)
            thumbnail = await resizeImage(dataUrl, THUMBNAIL_SIZE, 0.6)
          } else {
            // For PDFs, we don't have a thumbnail yet, maybe use a generic icon later
            thumbnail = '' 
          }

          resolve({
            data: finalData,
            type,
            hash,
            thumbnail,
            originalName: file.name,
            size: file.size,
            capturedAt
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

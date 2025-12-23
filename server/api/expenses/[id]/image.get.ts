import { blob } from 'hub:blob'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const key = `receipts/${id}.jpg`
  
  return blob.serve(event, key)
})


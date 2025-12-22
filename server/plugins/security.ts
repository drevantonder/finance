export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const secret = config.authSecret

  if (!secret || secret.length < 32) {
    const errorMsg = 'FATAL: NUXT_AUTH_SECRET must be at least 32 characters long.'
    console.error('\x1b[31m%s\x1b[0m', errorMsg)
    throw new Error(errorMsg)
  }
})

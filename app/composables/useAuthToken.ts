import { useLocalStorage } from '@vueuse/core'

export const useAuthToken = () => {
  const token = useLocalStorage<string | null>('hp_auth_token', null)

  const initializeFromUrl = () => {
    if (!process.client) return false

    // 1. Try fragment (most secure - not sent to server)
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const urlToken = params.get('token')

    if (urlToken) {
      token.value = urlToken
      
      // Clean up fragment immediately using replaceState
      // This removes it from the address bar and prevents it from being in history
      if (window.location.hash.includes('token=')) {
        const cleanUrl = window.location.pathname + window.location.search
        window.history.replaceState(null, '', cleanUrl)
      }
      return true
    }
    return false
  }

  const clearToken = () => {
    token.value = null
  }

  const isAuthenticated = computed(() => !!token.value)
  const isReady = ref(false)

  return {
    token,
    isAuthenticated,
    isReady,
    initializeFromUrl,
    clearToken
  }
}

export function useNetworkStatus() {
  const isOnline = ref(true)

  if (import.meta.client) {
    isOnline.value = window.navigator.onLine

    const updateOnlineStatus = () => {
      isOnline.value = window.navigator.onLine
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    onUnmounted(() => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    })
  }

  return {
    isOnline
  }
}

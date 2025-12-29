export function useNotifications() {
  const permission = ref<NotificationPermission>('default')
  
  onMounted(() => {
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
  })

  const requestPermission = async () => {
    if ('Notification' in window) {
      permission.value = await Notification.requestPermission()
    }
  }

  const notify = (title: string, options?: NotificationOptions) => {
    // Only notify when app is backgrounded
    if (permission.value === 'granted' && document.hidden) {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        ...options
      })
    }
  }

  const vibrate = (pattern: 'success' | 'error' | 'tap') => {
    if (!('vibrate' in navigator)) return

    const patterns = {
      tap: [10],
      success: [10, 50, 10],
      error: [50, 100, 50]
    }

    navigator.vibrate(patterns[pattern])
  }

  return {
    permission,
    requestPermission,
    notify,
    vibrate
  }
}

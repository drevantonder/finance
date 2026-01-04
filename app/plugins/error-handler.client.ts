export default defineNuxtPlugin((nuxtApp) => {
  const { logError } = useActivityLogger()

  // Vue errors
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    logError(`Vue Error: ${info}`, error, {
      component: instance?.$options?.name || 'unknown'
    })
  }

  // Window errors
  if (import.meta.client) {
    window.onerror = (message, source, lineno, colno, error) => {
      logError(`Uncaught Error: ${message}`, error, {
        source,
        lineno,
        colno
      })
    }

    window.onunhandledrejection = (event) => {
      logError(`Unhandled Promise Rejection: ${event.reason}`, event.reason)
    }
  }
})

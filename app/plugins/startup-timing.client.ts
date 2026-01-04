import { onLCP, onCLS, onTTFB, onINP, onFCP, type Metric } from 'web-vitals'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const startTime = performance.now()
  const vitals: Record<string, number | null> = {
    lcp: null,
    cls: null,
    ttfb: null,
    inp: null,
    fcp: null
  }

  // Collect Web Vitals
  onLCP((m: Metric) => vitals.lcp = m.value)
  onCLS((m: Metric) => vitals.cls = m.value)
  onTTFB((m: Metric) => vitals.ttfb = m.value)
  onINP((m: Metric) => vitals.inp = m.value)
  onFCP((m: Metric) => vitals.fcp = m.value)

  // App-specific metrics
  let sessionLoadMs: number | null = null
  let sseConnectMs: number | null = null

  window.addEventListener('session:loaded', (e: any) => {
    sessionLoadMs = e.detail.durationMs
  })

  window.addEventListener('sse:connected', (e: any) => {
    sseConnectMs = e.detail.durationMs
  })

  nuxtApp.hook('app:mounted', () => {
    // Wait a bit to ensure LCP and other vitals are captured 
    // and session/sse have a chance to finish
    setTimeout(() => {
      // Use runWithContext to ensure composables like useActivityLogger work correctly
      nuxtApp.runWithContext(async () => {
        const { log } = useActivityLogger()
        
        const navEntries = performance.getEntriesByType('navigation')
        if (navEntries.length === 0) return
        
        const nav = navEntries[0] as PerformanceNavigationTiming
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        
        const isCached = nav.transferSize === 0
        
        const metadata = {
          // Navigation Timing
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          domInteractive: Math.round(nav.domInteractive),
          domComplete: Math.round(nav.domComplete),
          loadEventEnd: Math.round(nav.loadEventEnd),
          
          // Cache detection
          transferSize: nav.transferSize,
          encodedBodySize: nav.encodedBodySize,
          decodedBodySize: nav.decodedBodySize,
          isCached,
          resourceCount: resources.length,
          
          // Resource breakdown
          jsBundleSize: Math.round(resources.filter(r => r.name.includes('.js')).reduce((a, r) => a + r.transferSize, 0)),
          cssBundleSize: Math.round(resources.filter(r => r.name.includes('.css')).reduce((a, r) => a + r.transferSize, 0)),
          
          // Web Vitals
          ...vitals,
          
          // App-specific
          nuxtMountMs: Math.round(performance.now() - startTime),
          sessionLoadMs: sessionLoadMs ? Math.round(sessionLoadMs) : null,
          sseConnectMs: sseConnectMs ? Math.round(sseConnectMs) : null,
          
          // Context
          pathname: window.location.pathname,
          connection: (navigator as any).connection?.effectiveType || 'unknown',
          deviceMemory: (navigator as any).deviceMemory || 'unknown',
          hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
        }

        await log({
          type: 'system',
          level: 'info',
          stage: 'startup',
          message: `App startup (${isCached ? 'cached' : 'fresh'})`,
          durationMs: Math.round(nav.domComplete),
          metadata
        })
      })
    }, 5000) // 5s delay to capture trailing vitals and connection events
  })
})

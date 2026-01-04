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

  // Device detection
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
  const screenWidth = window.screen.width
  const deviceType = isMobile ? 'mobile' : screenWidth < 1024 ? 'tablet' : 'desktop'

  // Git commit from runtime config
  const { gitCommit } = useRuntimeConfig().public

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

        // Network timing breakdown (diagnose TTFB issues)
        const networkTiming = {
          dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcp: Math.round(nav.connectEnd - nav.connectStart),
          tls: nav.secureConnectionStart > 0 ? Math.round(nav.connectEnd - nav.secureConnectionStart) : 0,
          request: Math.round(nav.responseStart - nav.requestStart),
          response: Math.round(nav.responseEnd - nav.responseStart),
        }

        // Top 5 slowest resources (>300ms)
        const slowResources = resources
          .filter(r => r.duration > 300)
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .map(r => ({
            name: r.name.split('/').pop()?.slice(0, 50),
            duration: Math.round(r.duration),
            size: r.transferSize
          }))

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
          hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',

          // Device info
          deviceType,
          screenWidth,
          screenHeight: window.screen.height,

          // Version
          gitCommit,

          // Network breakdown
          networkTiming,

          // Slow resources
          slowResources
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

import { onLCP, onCLS, onTTFB, onINP, onFCP, type Metric } from 'web-vitals'

interface ResourceEntry {
  name: string
  duration: number
  size: number
  type: 'fetch' | 'script' | 'stylesheet' | 'image' | 'font' | 'other' | 'wasm'
  startTime: number
  cached: boolean
  transferSize: number
}

interface PerformanceMark {
  name: string
  startTime: number
  duration?: number
}

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

  // Custom performance marks
  const marks: PerformanceMark[] = []

  const mark = (name: string) => {
    performance.mark(name)
    marks.push({
      name,
      startTime: performance.now()
    })
  }

  // Mark startup
  mark('app:startup')

  // App-specific metrics
  let sessionLoadMs: number | null = null
  let sseConnectMs: number | null = null

  window.addEventListener('session:loaded', (e: any) => {
    sessionLoadMs = e.detail.durationMs
    mark('session:loaded')
  })

  window.addEventListener('sse:connected', (e: any) => {
    sseConnectMs = e.detail.durationMs
    mark('sse:connected')
  })

  // Device detection
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
  const screenWidth = window.screen.width
  const deviceType = isMobile ? 'mobile' : screenWidth < 1024 ? 'tablet' : 'desktop'

  // Enable Vue performance mode
  nuxtApp.vueApp.config.performance = true

  // Track component render times
  const componentRenderTimes: Record<string, number> = {}

  nuxtApp.vueApp.mixin({
    beforeMount() {
      if (!this.$options.name) return
      mark(`component:${this.$options.name}:start`)
    },
    mounted() {
      if (!this.$options.name) return
      mark(`component:${this.$options.name}:end`)
      const startMark = performance.getEntriesByName(
        `component:${this.$options.name}:start`
      )[0] as PerformanceMark
      const endMark = performance.getEntriesByName(
        `component:${this.$options.name}:end`
      )[0] as PerformanceMark
      if (startMark && endMark) {
        const duration = endMark.startTime - startMark.startTime
        componentRenderTimes[this.$options.name] = (
          componentRenderTimes[this.$options.name] || 0
        ) + duration
      }
    }
  })

  // Service Worker detection and cache hit ratio
  let swStatus: 'active' | 'none' = 'none'
  let cacheHitRatio = 0

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        swStatus = 'active'
        mark('sw:active')
      }
    })
  }

  // Git commit from runtime config
  const { gitCommit } = useRuntimeConfig().public

  nuxtApp.hook('app:mounted', () => {
    mark('app:mounted')

    // Wait a bit to ensure LCP and other vitals are captured
    // and session/sse have a chance to finish
    setTimeout(() => {
      mark('collection:start')

      // Use runWithContext to ensure composables like useActivityLogger work correctly
      nuxtApp.runWithContext(async () => {
        const { log } = useActivityLogger()

        const navEntries = performance.getEntriesByType('navigation')
        if (navEntries.length === 0) return

        const nav = navEntries[0] as PerformanceNavigationTiming
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

        const isCached = nav.transferSize === 0

        // Enhanced resource timing collection
        const categorizedResources = resources.map((r): ResourceEntry => {
          const name = r.name.split('/').pop() || r.name
          let type: ResourceEntry['type'] = 'other'

          if (r.initiatorType === 'script') {
            type = r.name.includes('.js') || r.name.includes('.mjs') ? 'script' : 'other'
          } else if (r.initiatorType === 'link') {
            if (r.name.includes('.css')) type = 'stylesheet'
            else if (r.name.includes('.woff') || r.name.includes('.ttf') || r.name.includes('.eot')) type = 'font'
            else type = 'other'
          } else if (r.initiatorType === 'img') {
            type = 'image'
          } else if (r.initiatorType === 'fetch') {
            type = 'fetch'
          } else if (r.name.includes('.wasm')) {
            type = 'wasm'
          }

          return {
            name,
            duration: Math.round(r.duration),
            size: r.transferSize,
            type,
            startTime: Math.round(r.startTime),
            cached: r.transferSize === 0,
            transferSize: r.transferSize
          }
        })

        // Calculate cache hit ratio
        const cachedResources = categorizedResources.filter(r => r.cached)
        cacheHitRatio =
          categorizedResources.length > 0
            ? cachedResources.length / categorizedResources.length
            : 0

        // Resource type breakdown
        const resourceBreakdown = {
          fetch: categorizedResources.filter(r => r.type === 'fetch'),
          script: categorizedResources.filter(r => r.type === 'script'),
          stylesheet: categorizedResources.filter(r => r.type === 'stylesheet'),
          image: categorizedResources.filter(r => r.type === 'image'),
          font: categorizedResources.filter(r => r.type === 'font'),
          wasm: categorizedResources.filter(r => r.type === 'wasm'),
          other: categorizedResources.filter(r => r.type === 'other')
        }

        // Slowest resources per type
        const slowestByType = Object.entries(resourceBreakdown).reduce(
          (acc, [type, entries]) => {
            const slowest = entries
              .filter(r => r.duration > 100)
              .sort((a, b) => b.duration - a.duration)
              .slice(0, 3)
            if (slowest.length > 0) {
              acc[type] = slowest
            }
            return acc
          },
          {} as Record<string, ResourceEntry[]>
        )

        // Network timing breakdown (diagnose TTFB issues)
        const networkTiming = {
          dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcp: Math.round(nav.connectEnd - nav.connectStart),
          tls:
            nav.secureConnectionStart > 0
              ? Math.round(nav.connectEnd - nav.secureConnectionStart)
              : 0,
          request: Math.round(nav.responseStart - nav.requestStart),
          response: Math.round(nav.responseEnd - nav.responseStart)
        }

        // Top 5 slowest resources (>300ms) - keep for backward compatibility
        const slowResources = resources
          .filter(r => r.duration > 300)
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .map(r => ({
            name: r.name.split('/').pop()?.slice(0, 50),
            duration: Math.round(r.duration),
            size: r.transferSize
          }))

        // Get custom marks with durations
        const customMarks = marks.reduce((acc, mark) => {
          const endMark = performance
            .getEntriesByName(`${mark.name}:end`)
            .find(
              (m) => m.startTime >= mark.startTime
            )
          if (endMark) {
            acc[mark.name] = Math.round(endMark.startTime - mark.startTime)
          } else {
            acc[mark.name] = Math.round(mark.startTime)
          }
          return acc
        }, {} as Record<string, number>)

        mark('collection:end')

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

          // Resource breakdown (sizes)
          jsBundleSize: Math.round(
            resources
              .filter((r) => r.name.includes('.js'))
              .reduce((a, r) => a + r.transferSize, 0)
          ),
          cssBundleSize: Math.round(
            resources
              .filter((r) => r.name.includes('.css'))
              .reduce((a, r) => a + r.transferSize, 0)
          ),

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
          slowResources,

          // ENHANCED: Service Worker
          swStatus,
          cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,

          // ENHANCED: Custom performance marks
          customMarks,

          // ENHANCED: Component render times
          componentRenderTimes,

          // ENHANCED: Categorized resources (for waterfall)
          categorizedResources: categorizedResources.slice(0, 50),

          // ENHANCED: Slowest by type
          slowestByType,

          // ENHANCED: Resource type counts
          resourceCounts: Object.entries(resourceBreakdown).reduce(
            (acc, [type, entries]) => {
              acc[type] = entries.length
              return acc
            },
            {} as Record<string, number>
          )
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

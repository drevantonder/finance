import type { DehydratedState, VueQueryPluginOptions } from '@tanstack/vue-query'
import { QueryClient, VueQueryPlugin, dehydrate, hydrate } from '@tanstack/vue-query'
import { persistQueryClient } from '@tanstack/query-persist-client-core'
import { get, set, del } from 'idb-keyval'

export default defineNuxtPlugin((nuxt) => {
  const vueQueryState = useState<DehydratedState | null>('vue-query')

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,           // Consider data fresh for 30s
        gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24h
        refetchOnWindowFocus: true,   // Refresh when tab gains focus
        retry: 1,                     // Retry failed requests once
      },
    },
  })

  // Client-side: Setup IndexedDB persistence
  if (import.meta.client) {
    const persister = {
      persistClient: async (client: unknown) => {
        await set('vue-query-cache', client)
      },
      restoreClient: async () => {
        return await get('vue-query-cache')
      },
      removeClient: async () => {
        await del('vue-query-cache')
      },
    }

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    })
  }

  const options: VueQueryPluginOptions = { queryClient }

  nuxt.vueApp.use(VueQueryPlugin, options)

  // SSR: Hydrate on client, dehydrate on server
  if (import.meta.server) {
    nuxt.hooks.hook('app:rendered', () => {
      vueQueryState.value = dehydrate(queryClient)
    })
  }

  if (import.meta.client) {
    hydrate(queryClient, vueQueryState.value)
  }
})

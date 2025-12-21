export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxthub/core'],
  runtimeConfig: {
    authSecret: '', // Set via NUXT_AUTH_SECRET env var
    public: {
      // Stock API handled via server routes (Yahoo Finance)
    }
  },
  hub: {
    db: 'sqlite'
  },
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  ui: {
    colorMode: true // Ensure it's enabled but controlled
  },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})

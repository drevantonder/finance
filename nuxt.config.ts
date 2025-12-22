export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxthub/core'],

  hub: {
    db: {
      dialect: 'sqlite',
      driver: 'd1',
      connection: { databaseId: process.env.NUXT_HUB_DB_DATABASE_ID }
    }
  },

  runtimeConfig: {
    authSecret: '', // Set via NUXT_AUTH_SECRET env var
    public: {}
  },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    preset: "cloudflare_module",
    cloudflare: {
      nodeCompat: true,
    }
  }
})

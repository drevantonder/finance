export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxthub/core'],

  // Default: auto-detect storage backends
  hub: {
    blob: true,
    db: 'sqlite'
  },

  runtimeConfig: {
    authSecret: '', // Set via NUXT_AUTH_SECRET env var
    geminiApiKey: '', // Set via NUXT_GEMINI_API_KEY env var
    public: {}
  },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Production-only: Cloudflare Workers preset and specific drivers
  $production: {
    hub: {
      blob: {
        driver: 'cloudflare-r2',
        bucketName: 'finance-receipts',
        binding: 'BLOB'
      },
      db: {
        dialect: 'sqlite',
        driver: 'd1',
        connection: { databaseId: process.env.NUXT_HUB_CLOUDFLARE_DATABASE_ID }
      }
    },
    nitro: {
      preset: 'cloudflare_module',
      cloudflare: {
        nodeCompat: true,
        wrangler: {
          compatibility_date: '2025-12-22',
          compatibility_flags: ['nodejs_compat'],
          observability: {
            logs: {
              enabled: true,
            }
          }
        }
      },
      rollupConfig: {
        output: {
          intro: 'const __dirname = "";const __filename = "";'
        }
      }
    }
  }
})

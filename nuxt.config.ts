export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxthub/core', 'nuxt-auth-utils', '@vite-pwa/nuxt'],

  // SPA mode - enables full offline support with PWA
  ssr: false,

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Finance',
      short_name: 'Finance',
      theme_color: '#000000',
      icons: [
        {
          src: 'pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png'
        },
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
      // Disable navigateFallback - let Nuxt handle SPA routing
      // This avoids the "non-precached-url" error when index.html isn't in manifest
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  },

  // Default: auto-detect storage backends
  hub: {
    blob: true,
    db: 'sqlite'
  },

  runtimeConfig: {
    // Session password is set via NUXT_SESSION_PASSWORD env var
    oauth: {
      google: {
        clientId: '', // NUXT_OAUTH_GOOGLE_CLIENT_ID
        clientSecret: '' // NUXT_OAUTH_GOOGLE_CLIENT_SECRET
      }
    },
    geminiApiKey: '', // NUXT_GEMINI_API_KEY
    aiGatewayUrl: '', // NUXT_AI_GATEWAY_URL (optional, format: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id})
    public: {}
  },
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ui: {
    colorMode: false
  },

  // Production-only: Cloudflare Workers preset
  $production: {
    hub: {
      blob: { bucketName: 'finance-receipts' },
      db: {
        dialect: 'sqlite',
        driver: 'd1',
        databaseId: process.env.NUXT_HUB_CLOUDFLARE_DATABASE_ID
      }
    },
    nitro: {
      preset: 'cloudflare_module',
      cloudflare: {
        nodeCompat: true,
        wrangler: {
          compatibility_date: '2025-12-22',
          compatibility_flags: ['nodejs_compat'],
          observability: { logs: { enabled: true } }
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

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    projects: [
      {
        // Unit tests: Fast, no Nuxt context, pure functions
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          includeSource: ['app/composables/**/*.ts'],
          environment: 'node',
        },
        resolve: {
          alias: {
            '~': resolve(__dirname, 'app'),
          },
        },
      },
      {
        // Nuxt tests: Full Nuxt context, components, integration
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('./', import.meta.url)),
            },
          },
        },
      },
    ],
  },
})

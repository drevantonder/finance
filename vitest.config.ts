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
          environment: 'happy-dom',
          setupFiles: ['test/nuxt/setup.ts'],
          globals: true,
        },
        resolve: {
          alias: {
            '~': resolve(__dirname, 'app'),
            '~~': resolve(__dirname, '.'),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**/*.{ts,vue}', 'server/**/*.ts'],
      exclude: [
        'test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/.nuxt/**',
        '**/.data/**',
        '**/dist/**',
        'app/**/*.vue',
      ],
    },
  },
})
// @ts-ignore
const x: number = 'string'

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const error = computed(() => route.query.error as string | undefined)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-950 px-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-white tracking-tight">Finance</h1>
        <p class="text-gray-400 mt-3 text-lg">Sign in to manage your budget</p>
      </div>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Authentication failed"
          description="Unable to sign in. Please try again or contact support."
          class="mb-8"
        />

      <UButton
        to="/auth/google"
        external
        block
        size="lg"
        color="neutral"
        variant="solid"
        icon="i-simple-icons-google"
      >
        Sign in with Google
      </UButton>

      </div>
    </div>
  </div>
</template>

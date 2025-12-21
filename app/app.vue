<template>
  <UApp>
    <div v-if="!isReady" class="fixed inset-0 flex items-center justify-center bg-white z-[200]">
      <div class="flex flex-col items-center gap-3">
        <UIcon name="i-heroicons-home" class="h-8 w-8 text-primary-500 animate-pulse" />
        <div class="flex items-center gap-1.5 text-gray-400">
          <UIcon name="i-heroicons-lock-closed" class="h-3.5 w-3.5" />
          <span class="text-[10px] font-medium uppercase tracking-widest">Securing</span>
        </div>
      </div>
    </div>
    
    <TokenGate />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const store = useSessionStore()
const { isReady } = useAuthToken()

// Force light mode
const colorMode = useColorMode()
colorMode.preference = 'light'

onMounted(async () => {
  await store.initialise()
  isReady.value = true
  // Ensure light mode is set
  colorMode.preference = 'light'
})
</script>

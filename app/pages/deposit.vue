<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-900">Deposit Builder</h2>
      <NuxtLink to="/" class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
        <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
        Back to Dashboard
      </NuxtLink>
    </div>
    
    <DepositProjector 
      v-model="store.config.deposit" 
      :income-sources="store.config.incomeSources"
    />
  </div>
</template>

<script setup lang="ts">
const store = useSessionStore()
</script>

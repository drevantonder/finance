<script setup lang="ts">
const isOnline = useOnline()
</script>

<template>
  <div v-if="!isOnline" class="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-100 text-neutral-500 rounded-lg text-xs font-medium border border-neutral-200">
    <UIcon name="i-heroicons-signal-slash" class="w-4 h-4" />
    <span>Offline Mode</span>
  </div>
</template>

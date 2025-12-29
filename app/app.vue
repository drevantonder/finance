<script setup lang="ts">
import { useRealtimeSync } from '~/composables/useRealtimeSync'

// Enable real-time sync across devices
useRealtimeSync()
</script>

<template>
  <UApp>
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

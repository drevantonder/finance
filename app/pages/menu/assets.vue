<script setup lang="ts">
const store = useSessionStore()
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <DepositProjector 
      :deposit="store.config.deposit" 
      :income-sources="store.config.incomeSources"
    />
  </div>
</template>

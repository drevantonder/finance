<script setup lang="ts">
import CategoryManager from '~/components/expenses/CategoryManager.vue'
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6 pb-24">
    <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <NuxtLink to="/menu" class="hover:text-primary-600 flex items-center gap-1">
        <UIcon name="i-heroicons-chevron-left" />
        Menu
      </NuxtLink>
    </div>

    <CategoryManager />
  </div>
</template>

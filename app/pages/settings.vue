<script setup lang="ts">
import CategoryManager from '~/components/settings/CategoryManager.vue'
const toast = useToast()

function clearData() {
  if (confirm('Are you sure you want to clear all local data? This will not delete data from the cloud.')) {
    localStorage.clear()
    window.location.reload()
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Settings</h2>
      <p class="text-gray-500">Manage your categories and app data.</p>
    </div>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-red-600 flex items-center gap-2">
          <UIcon name="i-heroicons-trash" />
          Danger Zone
        </h3>
      </template>

      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-gray-900">Clear Local Cache</p>
          <p class="text-sm text-gray-500">Clears localStorage and IndexedDB. Useful if sync is stuck.</p>
        </div>
        <UButton color="error" variant="soft" @click="clearData">
          Reset App
        </UButton>
      </div>
    </UCard>

    <CategoryManager />
  </div>
</template>

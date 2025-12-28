<script setup lang="ts">
const store = useSessionStore()

function resetApp() {
  if (confirm('Are you sure you want to reset all local data? This cannot be undone.')) {
    localStorage.clear()
    window.location.reload()
  }
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Expense Categories</h3>
      </template>
      <CategoryManager />
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-error-600">Danger Zone</h3>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Reset Application</p>
          <p class="text-sm text-gray-500">Clears all local settings and cache. Use with caution.</p>
        </div>
        <UButton
          label="Reset All Data"
          color="error"
          variant="soft"
          icon="i-heroicons-trash"
          @click="resetApp"
        />
      </div>
    </UCard>
  </div>
</template>

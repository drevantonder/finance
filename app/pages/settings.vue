<script setup lang="ts">
const { token } = useAuthToken()
const toast = useToast()

const shareUrl = computed(() => {
  if (!process.client) return ''
  const url = new URL(window.location.origin)
  // Use fragment (#) instead of query (?) for better security
  // Encode the token to handle special characters
  url.hash = `token=${encodeURIComponent(token.value || '')}`
  return url.toString()
})

function copyLink() {
  navigator.clipboard.writeText(shareUrl.value)
  toast.add({
    title: 'Link copied!',
    description: 'Anyone with this link can access your data.',
    color: 'success',
    icon: 'i-heroicons-check-circle'
  })
}

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
      <p class="text-gray-500">Manage your sync and device access.</p>
    </div>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-share" />
          Connect New Device
        </h3>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          To access your data from another device (phone, tablet, laptop), use this "Magic Link". 
          It contains your secret access token.
        </p>

        <div class="flex gap-2">
          <UInput
            :model-value="shareUrl"
            readonly
            class="flex-1"
            icon="i-heroicons-link"
          />
          <UButton
            icon="i-heroicons-clipboard-document"
            color="neutral"
            @click="copyLink"
          >
            Copy
          </UButton>
        </div>

        <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-amber-500 shrink-0" />
          <p class="text-xs text-amber-700">
            <strong>Security Warning:</strong> This link grants full access to your financial data. 
            Do not share it publicly. Send it to yourself via a secure channel (e.g., 1Password, Signal, encrypted email).
          </p>
        </div>
      </div>
    </UCard>

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
  </div>
</template>

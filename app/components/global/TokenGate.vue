<script setup lang="ts">
const store = useSessionStore()
const { token, isAuthenticated } = useAuthToken()

const inputToken = ref('')
const isLoading = ref(false)
const error = ref('')

async function onUnlock() {
  if (!inputToken.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    // Temporarily set token to verify
    token.value = inputToken.value
    await store.initialise()
    
    if (!isAuthenticated.value) {
      token.value = null
      error.value = 'Invalid access token'
    }
  } catch (e) {
    token.value = null
    error.value = 'Failed to verify token'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="!isAuthenticated" class="fixed inset-0 z-[150] flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-4">
    <UCard 
      class="w-full max-w-[280px] shadow-sm ring-1 ring-gray-200 bg-white"
      :ui="{ 
        body: 'p-5',
        header: 'hidden',
        footer: 'hidden'
      }"
    >
      <div class="flex flex-col items-center gap-5">
        <div class="p-2 bg-gray-50 rounded-lg">
          <UIcon name="i-heroicons-lock-closed" class="h-5 w-5 text-gray-400" />
        </div>
        
        <form @submit.prevent="onUnlock" class="w-full space-y-3">
          <UFormField :error="error">
            <UInput
              v-model="inputToken"
              type="password"
              placeholder="Enter access token"
              size="md"
              autofocus
              class="font-mono w-full"
              :ui="{ base: 'text-center' }"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="md"
            :loading="isLoading"
            color="neutral"
            variant="solid"
            class="w-full"
          >
            Unlock Dashboard
          </UButton>
        </form>
      </div>
    </UCard>
  </div>
</template>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo/Title -->
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-home" class="h-6 w-6 text-primary-600" />
            <h1 class="text-xl font-semibold text-gray-900">Personal Finance</h1>
          </div>

          <!-- Session Info -->
          <div class="flex items-center gap-4">
            <SyncIndicator />
            <UDropdownMenu
              v-if="user"
              :items="[{ label: 'Sign out', icon: 'i-heroicons-arrow-right-on-rectangle', click: logout }]"
            >
              <UButton color="neutral" variant="ghost" class="gap-2">
                <UAvatar :src="user.picture" :alt="user.name" size="xs" />
                <span class="hidden sm:inline">{{ user.name }}</span>
              </UButton>
            </UDropdownMenu>
            <div class="hidden sm:flex items-center gap-4">
              <div class="flex items-center gap-1 text-sm text-gray-500">
                <span class="font-medium">Today:</span>
                <span>{{ todayLabel }}</span>
              </div>
              <div class="text-gray-300">→</div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-500">Target</label>
                <input 
                  type="date" 
                  :value="store.config.deposit.targetDate"
                  @input="(e) => store.config.deposit.targetDate = (e.target as HTMLInputElement).value"
                  class="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 px-2 py-1"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="flex gap-6 -mb-px">
          <NuxtLink
            to="/"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            to="/household"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path.startsWith('/household')
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Household
          </NuxtLink>
          <NuxtLink
            to="/budget"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/budget' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Budget
          </NuxtLink>
          <NuxtLink
            to="/deposit"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/deposit' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Deposit
          </NuxtLink>
          <NuxtLink
            to="/costs"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/costs' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Costs
          </NuxtLink>
          <NuxtLink
            to="/bank"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/bank' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Bank
          </NuxtLink>
          <NuxtLink
            to="/expenses"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/expenses' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Expenses
          </NuxtLink>
          <NuxtLink
            to="/activity"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/activity' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Activity
          </NuxtLink>
          <NuxtLink
            to="/settings"
            class="border-b-2 py-4 text-sm font-medium transition-colors"
            :class="$route.path === '/settings' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Settings
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const store = useSessionStore()
const { user, clear } = useUserSession()

async function logout() {
  await clear()
  navigateTo('/login')
}

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('en-AU', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
})
</script>

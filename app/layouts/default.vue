<script setup lang="ts">
const store = useSessionStore()
const { user, clear } = useUserSession()
const route = useRoute()
const isCollapsed = ref(false)

onMounted(() => {
  store.load()
})

async function logout() {
  await clear()
  navigateTo('/login')
}

// 5-Slot Navigation
const navItems = [
  { label: 'Dash', to: '/', icon: 'i-heroicons-home' },
  { label: 'Expenses', to: '/expenses', icon: 'i-heroicons-banknotes' },
  { label: 'Capture', to: '/capture', icon: 'i-heroicons-camera' },
  { label: 'Goal', to: '/goal', icon: 'i-heroicons-home-modern' },
  { label: 'Menu', to: '/menu', icon: 'i-heroicons-bars-3' }
]

const strategyItems = [
  { label: 'Income', to: '/menu/income', icon: 'i-heroicons-user-group' },
  { label: 'Assets', to: '/menu/assets', icon: 'i-heroicons-circle-stack' },
  { label: 'Budget', to: '/menu/budget', icon: 'i-heroicons-chart-pie' },
  { label: 'Bank', to: '/menu/bank', icon: 'i-heroicons-building-library' },
  { label: 'Costs', to: '/menu/costs', icon: 'i-heroicons-calculator' }
]

const systemItems = [
  { label: 'System', to: '/menu/system', icon: 'i-heroicons-cog-6-tooth' },
  { label: 'Settings', to: '/menu/settings', icon: 'i-heroicons-adjustments-horizontal' }
]

const menuItems = [...strategyItems, ...systemItems]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path)
}

const currentPageTitle = computed(() => {
  const allItems = [...navItems, ...menuItems]
    .sort((a, b) => b.to.length - a.to.length)
  const item = allItems.find(i => isActive(i.to))
  return item?.label || 'Finance'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
    <!-- Desktop Sidebar -->
    <aside 
      class="hidden lg:flex flex-col bg-white border-r border-gray-200 sticky top-0 h-screen transition-all duration-300 z-50"
      :class="isCollapsed ? 'w-20' : 'w-64'"
    >
      <!-- Logo Area -->
      <div class="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap">
        <UIcon name="i-heroicons-chart-bar-square" class="h-8 w-8 text-primary-600 flex-shrink-0" />
        <span v-if="!isCollapsed" class="text-xl font-bold text-gray-900">Finance</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 space-y-1 mt-4 overflow-y-auto overflow-x-hidden">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative"
          :class="isActive(item.to)
            ? 'bg-primary-50 text-primary-600 font-bold' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        >
          <UIcon :name="item.icon" class="h-6 w-6 flex-shrink-0" />
          <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
          
          <!-- Special styling for Capture in sidebar -->
          <div v-if="item.to === '/capture' && isCollapsed" class="absolute -right-1 top-0 w-2 h-2 bg-primary-500 rounded-full" />
        </NuxtLink>

        <!-- Menu Expansion in Sidebar -->
        <div v-if="!isCollapsed" class="pt-8 pb-2">
          <div class="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Strategy
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in strategyItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              :class="$route.path === item.to
                ? 'bg-gray-100 text-gray-900 font-semibold' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <UIcon :name="item.icon" class="h-4 w-4" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>

          <div class="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-6">
            System
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in systemItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              :class="$route.path === item.to
                ? 'bg-gray-100 text-gray-900 font-semibold' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <UIcon :name="item.icon" class="h-4 w-4" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- Sidebar Bottom -->
      <div class="p-4 border-t border-gray-100 space-y-4">
        <div class="flex items-center gap-3 overflow-hidden" :class="{ 'justify-center': isCollapsed }">
          <div class="relative">
            <UAvatar :src="(user as any)?.pictureUrl || (user as any)?.picture" :alt="(user as any)?.name || (user as any)?.email" size="sm" />
            <SyncIndicator is-dot class="absolute -bottom-1 -right-1" />
          </div>
          <div v-if="!isCollapsed" class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate">{{ (user as any)?.name || (user as any)?.email }}</div>
            <UButton 
              variant="link" 
              color="neutral" 
              size="xs" 
              class="p-0 h-auto font-normal text-gray-500 hover:text-primary-600"
              label="Sign out"
              @click="logout"
            />
          </div>
        </div>

        <UButton
          :icon="isCollapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'"
          variant="ghost"
          color="neutral"
          size="xs"
          block
          :label="isCollapsed ? '' : 'Collapse'"
          @click="isCollapsed = !isCollapsed"
        />
      </div>
    </aside>

    <!-- Mobile Header -->
    <header class="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="px-4 h-16 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-chart-bar-square" class="h-8 w-8 text-primary-600" />
          <span class="font-bold text-lg text-gray-900">{{ currentPageTitle }}</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <UAvatar :src="(user as any)?.pictureUrl || (user as any)?.picture" :alt="(user as any)?.name || (user as any)?.email" size="sm" />
            <SyncIndicator is-dot class="absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full" />
          </div>
        </div>
      </div>
    </header>

    <!-- Content Area -->
    <main class="flex-1 min-w-0">
      <div class="max-w-7xl mx-auto p-4 lg:p-10 pb-28 lg:pb-10">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav 
      v-if="!$route.meta.hideNav"
      class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-2 py-3 z-40 flex justify-around items-center"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95"
        :class="isActive(item.to)
          ? 'text-primary-600' 
          : 'text-gray-400'"
      >
        <div 
          class="h-9 w-12 flex items-center justify-center rounded-2xl transition-all"
          :class="[
            isActive(item.to) 
              ? 'bg-primary-50' 
              : '',
            item.to === '/capture' ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : ''
          ]"
        >
          <UIcon :name="item.icon" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style>
/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>

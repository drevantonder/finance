<script setup lang="ts">
const store = useSessionStore()
const { user, clear } = useUserSession()
const route = useRoute()
const isCollapsed = ref(false)
const { mainNavItems, strategyItems, systemItems } = useNavigation()

const isOnline = useOnline()
const uploadQueue = useUploadQueue()
const { processFile } = useFileProcessor()

// Queue panel state
const isQueuePanelOpen = ref(false)



onMounted(() => {
  store.load()
  uploadQueue.init()
})

// Handle files dropped via drag & drop
async function handleFilesDropped(files: FileList) {
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      continue
    }
    try {
      const processed = await processFile(file)
      uploadQueue.addToQueue(processed)
    } catch (error) {
      console.error('Failed to process dropped file:', error)
    }
  }
}

async function logout() {
  await clear()
  navigateTo('/login')
}

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path)
}

const currentPageTitle = computed(() => {
  const allItems = [...mainNavItems, ...strategyItems, ...systemItems]
    .sort((a, b) => b.to.length - a.to.length)
  const item = allItems.find(i => isActive(i.to))
  return item?.label || 'Finance'
})
</script>

<template>
  <div class="h-[100dvh] bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
    <DropZone @files-dropped="handleFilesDropped" />
    
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

      <!-- Primary Action -->
      <div class="px-4 mb-2">
        <UploadButton :collapsed="isCollapsed" />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 space-y-1 mt-2 overflow-y-auto overflow-x-hidden">
        <template v-for="item in mainNavItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative"
            :class="isActive(item.to)
              ? 'bg-primary-50 text-primary-600 font-bold' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <UIcon :name="item.icon" class="h-6 w-6 flex-shrink-0" />
            <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </template>

        <!-- Strategy Section -->
        <div v-if="!isCollapsed" class="pt-8 pb-2">
          <div class="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Strategy
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in strategyItems.filter(i => !i.disabled)"
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

        <!-- System Section -->
        <div v-if="!isCollapsed" class="pt-6 pb-2">
          <div class="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            System
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in systemItems.filter(i => !i.disabled)"
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
      <div class="mt-auto p-4 space-y-3 border-t border-gray-200">
        <QueueIndicator @click="isQueuePanelOpen = true" class="mb-3" />
         
         <!-- Divider -->
         <div class="h-px bg-gray-200 w-full mb-3" />
         
         <!-- User Info -->
         <div class="flex items-center gap-3 overflow-hidden mb-3" :class="{ 'justify-center': isCollapsed }">
            <UAvatar :src="(user as any)?.pictureUrl || (user as any)?.picture" :alt="(user as any)?.name || (user as any)?.email" size="sm" />
            <div v-if="!isCollapsed" class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ (user as any)?.name || (user as any)?.email }}</div>
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
         
         <!-- Collapse Toggle -->
         <button
            @click="isCollapsed = !isCollapsed"
            class="w-full py-2 flex items-center text-sm text-gray-500 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-50 px-3"
            :class="isCollapsed ? 'justify-center' : 'justify-start gap-2'"
          >
            <UIcon :name="isCollapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'" class="h-4 w-4" />
            <span v-if="!isCollapsed">Collapse Sidebar</span>
          </button>
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
          <QueueIndicator @click="isQueuePanelOpen = true" />
          <div class="relative">
            <UAvatar :src="(user as any)?.pictureUrl || (user as any)?.picture" :alt="(user as any)?.name || (user as any)?.email" size="sm" />
          </div>
        </div>
      </div>
    </header>

    <!-- Content Area -->
    <main class="flex-1 min-w-0 relative h-full flex flex-col overflow-hidden">
      <div class="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-10 pb-28 lg:pb-10 relative overflow-y-auto">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav 
      v-if="!$route.meta.hideNav"
      class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-2 py-3 z-40 flex justify-around items-center"
    >
      <!-- Dashboard -->
      <NuxtLink to="/" class="flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95" :class="isActive('/') ? 'text-primary-600' : 'text-gray-400'">
        <div class="h-9 w-12 flex items-center justify-center rounded-2xl transition-all" :class="isActive('/') ? 'bg-primary-50' : ''">
          <UIcon name="i-heroicons-home" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
      </NuxtLink>

      <!-- Expenses -->
      <NuxtLink to="/expenses" class="flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95" :class="isActive('/expenses') ? 'text-primary-600' : 'text-gray-400'">
        <div class="h-9 w-12 flex items-center justify-center rounded-2xl transition-all" :class="isActive('/expenses') ? 'bg-primary-50' : ''">
          <UIcon name="i-heroicons-banknotes" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">Expenses</span>
      </NuxtLink>

      <!-- Claims -->
      <NuxtLink to="/menu/claims" class="flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95" :class="isActive('/menu/claims') ? 'text-primary-600' : 'text-gray-400'">
        <div class="h-9 w-12 flex items-center justify-center rounded-2xl transition-all" :class="isActive('/menu/claims') ? 'bg-primary-50' : ''">
          <UIcon name="i-heroicons-document-check" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">Claims</span>
      </NuxtLink>

      <!-- Capture (Middle) -->
      <CaptureButton />

      <!-- Goal -->
      <NuxtLink to="/goal" class="flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95" :class="isActive('/goal') ? 'text-primary-600' : 'text-gray-400'">
        <div class="h-9 w-12 flex items-center justify-center rounded-2xl transition-all" :class="isActive('/goal') ? 'bg-primary-50' : ''">
          <UIcon name="i-heroicons-home-modern" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">Goal</span>
      </NuxtLink>

      <!-- Menu -->
      <NuxtLink to="/menu" class="flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95" :class="isActive('/menu') ? 'text-primary-600' : 'text-gray-400'">
        <div class="h-9 w-12 flex items-center justify-center rounded-2xl transition-all" :class="isActive('/menu') ? 'bg-primary-50' : ''">
          <UIcon name="i-heroicons-bars-3" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider">Menu</span>
      </NuxtLink>
    </nav>

    <QueuePanel v-model:open="isQueuePanelOpen" />
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

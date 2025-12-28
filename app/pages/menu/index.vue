<script setup lang="ts">
const { navGroups } = useNavigation()
const groups = navGroups
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8 pb-24">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Menu</h1>

    <div v-for="group in groups" :key="group.label" class="space-y-4">
      <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{{ group.label }}</h2>
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        <NuxtLink
          v-for="item in group.items"
          :key="item.label"
          :to="item.disabled ? undefined : item.to"
          class="flex items-center justify-between p-4 transition-all group"
          :class="[
            item.disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          ]"
        >
          <div class="flex items-center gap-4">
            <div :class="[item.color, 'p-2 rounded-lg text-white']">
              <UIcon :name="item.icon" class="w-5 h-5 block" />
            </div>
            <div>
              <div class="font-semibold text-gray-900 dark:text-white">{{ item.label }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ item.description }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge v-if="item.disabled" color="neutral" variant="subtle" size="sm">
              Coming Soon
            </UBadge>
            <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

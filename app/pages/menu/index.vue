<script setup lang="ts">
const navItems = [
  { label: 'Income Strategy', to: '/menu/income', icon: 'i-heroicons-user-group', color: 'bg-blue-500', description: 'TMN, Salary, Household', disabled: false },
  { label: 'Assets', to: '/menu/assets', icon: 'i-heroicons-banknotes', color: 'bg-emerald-500', description: 'Cash, Stocks, FHSS', disabled: false },
  { label: 'Budget', to: '/menu/budget', icon: 'i-heroicons-chart-pie', color: 'bg-orange-500', description: 'Savings goals, limits', disabled: false },
  { label: 'Bank Rules', to: '/menu/bank', icon: 'i-heroicons-building-library', color: 'bg-indigo-500', description: 'DTI, Serviceability', disabled: false },
  { label: 'Purchase Costs', to: '/menu/costs', icon: 'i-heroicons-calculator', color: 'bg-violet-500', description: 'Stamp duty, Legal fees', disabled: false }
]

const systemItems = [
  { label: 'System Health', to: '/menu/system', icon: 'i-heroicons-heart', color: 'bg-rose-500', description: 'Inbox debug, Logs', disabled: false },
  { label: 'Claims', to: '/menu/claims', icon: 'i-heroicons-document-check', color: 'bg-indigo-500', description: 'MFB tracking (Coming Soon)', disabled: true },
  { label: 'Settings', to: '/menu/settings', icon: 'i-heroicons-cog-6-tooth', color: 'bg-gray-500', description: 'Categories, Data', disabled: false }
]
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8">
    <h1 class="text-2xl font-bold text-gray-900">Menu</h1>

    <div class="space-y-4">
      <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Money & Strategy</h2>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        <component
          :is="item.disabled ? 'div' : 'NuxtLink'"
          v-for="item in navItems"
          :key="item.to"
          :to="item.disabled ? undefined : item.to"
          class="flex items-center gap-4 p-4 transition-colors group"
          :class="item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'"
        >
          <div :class="[item.color, 'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform']">
            <UIcon :name="item.icon" class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <div class="text-sm font-bold text-gray-900 flex items-center gap-2">
              {{ item.label }}
              <UBadge v-if="item.disabled" size="xs" variant="subtle" color="neutral">Coming Soon</UBadge>
            </div>
            <div class="text-xs text-gray-500">{{ item.description }}</div>
          </div>
          <UIcon v-if="!item.disabled" name="i-heroicons-chevron-right" class="text-gray-300 w-5 h-5" />
        </component>
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">System</h2>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        <component
          :is="item.disabled ? 'div' : 'NuxtLink'"
          v-for="item in systemItems"
          :key="item.to"
          :to="item.disabled ? undefined : item.to"
          class="flex items-center gap-4 p-4 transition-colors group"
          :class="item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'"
        >
          <div :class="[item.color, 'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform']">
            <UIcon :name="item.icon" class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <div class="text-sm font-bold text-gray-900 flex items-center gap-2">
              {{ item.label }}
              <UBadge v-if="item.disabled" size="xs" variant="subtle" color="neutral">Coming Soon</UBadge>
            </div>
            <div class="text-xs text-gray-500">{{ item.description }}</div>
          </div>
          <UIcon v-if="!item.disabled" name="i-heroicons-chevron-right" class="text-gray-300 w-5 h-5" />
        </component>
      </div>
    </div>
  </div>
</template>

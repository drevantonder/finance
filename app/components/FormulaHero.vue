<template>
  <div class="rounded-2xl bg-linear-to-br from-primary-50 to-blue-50 p-3 sm:p-5 md:p-6 shadow-lg">
    <!-- Shared Target Date -->
    <div class="text-center mb-4">
      <div class="inline-flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-white/80">
        <UIcon name="i-heroicons-calendar-days" class="text-primary-500 w-4 h-4" />
        <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">As of {{ targetDateLabel }}</span>
      </div>
    </div>

    <!-- The Formula -->
    <div class="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-5 md:gap-6 lg:gap-8">
      <!-- Deposit -->
      <NuxtLink 
        to="/menu/assets"
        class="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105 shrink-0 w-full md:w-auto"
      >
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-banknotes" class="h-5 w-5 text-blue-600" />
          <span class="text-xs sm:text-sm font-medium text-gray-600">Deposit</span>
        </div>
        <div class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-blue-600 group-hover:text-blue-700 whitespace-nowrap">
          {{ formatCurrency(projectedDeposit) }}
        </div>
      </NuxtLink>

      <!-- Plus Sign -->
      <div class="hidden md:block text-2xl sm:text-3xl font-light text-gray-400 shrink-0">+</div>
      <div class="md:hidden w-6 h-px bg-gray-200"></div>

      <!-- Borrowing Capacity -->
      <NuxtLink
        to="/menu/bank"
        class="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105 shrink-0 w-full md:w-auto"
      >
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-building-library" class="h-5 w-5 text-emerald-600" />
          <span class="text-xs sm:text-sm font-medium text-gray-600">Borrowing Power</span>
        </div>
        <div class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-emerald-600 group-hover:text-emerald-700 whitespace-nowrap">
          {{ formatCurrency(borrowingCapacity) }}
        </div>
      </NuxtLink>

      <!-- Minus Sign -->
      <div class="hidden md:block text-2xl sm:text-3xl font-light text-gray-400 shrink-0">-</div>
      <div class="md:hidden w-6 h-px bg-gray-200"></div>

      <!-- Costs -->
      <NuxtLink 
        to="/menu/costs"
        class="flex flex-col items-center gap-1 group transition-transform hover:scale-105 shrink-0 w-full md:w-auto"
      >
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-calculator" class="h-5 w-5 text-orange-600" />
          <span class="text-xs sm:text-sm font-medium text-gray-600">Stamp Duty & Fees</span>
        </div>
        <div class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-orange-600 group-hover:text-orange-700 whitespace-nowrap">
          {{ formatCurrency(maxPurchasePrice - affordablePrice) }}
        </div>
      </NuxtLink>

      <!-- Equals Sign -->
      <div class="hidden md:block text-2xl sm:text-3xl font-light text-gray-400 shrink-0">=</div>
      <div class="md:hidden w-full max-w-[200px] h-px bg-gray-200 my-2"></div>

      <!-- Max Purchase Price (Result) -->
      <div class="flex flex-col items-center gap-1 shrink-0 w-full md:w-auto">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-home" class="h-6 w-6 text-purple-600" />
          <span class="text-sm font-bold text-gray-700">House Price</span>
        </div>
        <div class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-purple-600 whitespace-nowrap">
          {{ formatCurrency(affordablePrice) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency, formatDateLabel } from '~/composables/useFormatter'

const props = defineProps<{
  projectedDeposit: number
  borrowingCapacity: number
  maxPurchasePrice: number
  affordablePrice: number
  targetDate: string
}>()

const targetDateLabel = computed(() => props.targetDate ? formatDateLabel(props.targetDate, 'short') : '')
</script>

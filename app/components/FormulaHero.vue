<template>
  <div class="rounded-2xl bg-linear-to-br from-primary-50 to-blue-50 p-4 sm:p-6 lg:p-8 shadow-lg">
    <!-- The Formula -->
    <div class="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-10 xl:gap-12">
      <!-- Deposit -->
      <NuxtLink 
        to="/menu/assets"
        class="group flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 shrink-0 w-full sm:w-auto"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-banknotes" class="h-6 w-6 text-blue-600" />
          <span class="text-sm font-medium text-gray-600">Projected Deposit</span>
        </div>
        <div class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-blue-600 group-hover:text-blue-700 whitespace-nowrap">
          {{ formatCurrency(projectedDeposit) }}
        </div>
        <div class="text-xs text-gray-500">{{ targetDateLabel }}</div>
      </NuxtLink>

      <!-- Plus Sign -->
      <div class="hidden lg:block text-3xl font-light text-gray-400 shrink-0">+</div>
      <div class="lg:hidden w-8 h-px bg-gray-200 my-2"></div>

      <!-- Borrowing Capacity -->
      <NuxtLink
        to="/menu/bank"
        class="group flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 shrink-0 w-full sm:w-auto"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-building-library" class="h-6 w-6 text-emerald-600" />
          <span class="text-sm font-medium text-gray-600">Borrowing Power</span>
        </div>
        <div class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-emerald-600 group-hover:text-emerald-700 whitespace-nowrap">
          {{ formatCurrency(borrowingCapacity) }}
        </div>
        <div class="text-xs text-gray-500">100% MFB recognition</div>
      </NuxtLink>

      <!-- Minus Sign -->
      <div class="hidden lg:block text-3xl font-light text-gray-400 shrink-0">-</div>
      <div class="lg:hidden w-8 h-px bg-gray-200 my-2"></div>

      <!-- Costs -->
      <NuxtLink 
        to="/menu/costs"
        class="flex flex-col items-center gap-2 group transition-transform hover:scale-105 shrink-0 w-full sm:w-auto"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-calculator" class="h-6 w-6 text-orange-600" />
          <span class="text-sm font-medium text-gray-600">Est. Costs</span>
        </div>
        <div class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-orange-600 group-hover:text-orange-700 whitespace-nowrap">
          {{ formatCurrency(maxPurchasePrice - affordablePrice) }}
        </div>
        <div class="text-xs text-gray-500">Stamp Duty & Fees</div>
      </NuxtLink>

      <!-- Equals Sign -->
      <div class="hidden lg:block text-3xl font-light text-gray-400 shrink-0">=</div>
      <div class="lg:hidden w-full max-w-xs h-px bg-gray-200 my-4"></div>

      <!-- Max Purchase Price (Result) -->
      <div class="flex flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-home" class="h-7 w-7 text-purple-600" />
          <span class="text-base font-bold text-gray-700">House Price</span>
        </div>
        <div class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-purple-600 whitespace-nowrap">
          {{ formatCurrency(affordablePrice) }}
        </div>
        <div class="text-xs text-gray-500">Purchasing Power</div>
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

const targetDateLabel = computed(() => formatDateLabel(props.targetDate, 'short'))
</script>

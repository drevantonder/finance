<template>
  <div class="rounded-2xl bg-linear-to-br from-primary-50 to-blue-50 p-8 shadow-lg">
    <!-- The Formula -->
    <div class="flex flex-col xl:flex-row items-center justify-center gap-6 xl:gap-8">
      <!-- Deposit -->
      <NuxtLink 
        to="/deposit"
        class="group flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-banknotes" class="h-6 w-6 text-blue-600" />
          <span class="text-sm font-medium text-gray-600">Projected Deposit</span>
        </div>
        <div class="text-3xl lg:text-4xl font-bold text-blue-600 group-hover:text-blue-700">
          {{ formatCurrency(projectedDeposit) }}
        </div>
        <div class="text-xs text-gray-500">{{ targetDateLabel }}</div>
      </NuxtLink>

      <!-- Plus Sign -->
      <div class="text-2xl lg:text-3xl font-light text-gray-400">+</div>

      <!-- Borrowing Capacity -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-building-library" class="h-6 w-6 text-emerald-600" />
          <span class="text-sm font-medium text-gray-600">Borrowing Power</span>
        </div>
        <div class="text-3xl lg:text-4xl font-bold text-emerald-600">
          {{ formatCurrency(borrowingCapacity) }}
        </div>
        <div class="text-xs text-gray-500">100% MFB recognition</div>
      </div>

      <!-- Minus Sign -->
      <div class="text-2xl lg:text-3xl font-light text-gray-400">-</div>

      <!-- Costs -->
      <NuxtLink 
        to="/costs"
        class="flex flex-col items-center gap-2 group transition-transform hover:scale-105"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-calculator" class="h-6 w-6 text-orange-600" />
          <span class="text-sm font-medium text-gray-600">Est. Costs</span>
        </div>
        <div class="text-3xl lg:text-4xl font-bold text-orange-600 group-hover:text-orange-700">
          {{ formatCurrency(maxPurchasePrice - affordablePrice) }}
        </div>
        <div class="text-xs text-gray-500">Stamp Duty & Fees</div>
      </NuxtLink>

      <!-- Equals Sign -->
      <div class="text-2xl lg:text-3xl font-light text-gray-400">=</div>

      <!-- Max Purchase Price (Result) -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-home" class="h-7 w-7 text-purple-600" />
          <span class="text-base font-bold text-gray-700">House Price</span>
        </div>
        <div class="text-4xl lg:text-5xl font-extrabold text-purple-600">
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

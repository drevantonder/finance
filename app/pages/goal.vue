<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatter'
import { useProjectionResults } from '~/composables/useProjectionResults'

const store = useSessionStore()
const { 
  borrowingResult: result, 
  smartResult, 
  chartSeries, 
  hasPartialMonthExcluded, 
  targetDateLabel, 
  exactTargetDateLabel 
} = useProjectionResults()
</script>

<template>
  <div class="space-y-10">
    <!-- Header & Target Date -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-gray-900 tracking-tight">House Goal</h1>
        <p class="text-gray-500 font-medium">Your path to home ownership</p>
      </div>

      <div class="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
        <UIcon name="i-heroicons-calendar-days" class="text-primary-500 w-5 h-5" />
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Purchase Date</span>
          <input 
            type="date" 
            :value="store.config.deposit.targetDate"
            @input="(e) => store.config.deposit.targetDate = (e.target as HTMLInputElement).value"
            class="text-sm font-bold text-gray-900 border-none p-0 focus:ring-0 w-32"
          />
        </div>
      </div>
    </div>

    <!-- Formula Hero (The North Star) -->
    <FormulaHero
      :projected-deposit="store.projectedDeposit"
      :borrowing-capacity="result.borrowingCapacity"
      :max-purchase-price="result.maxPurchasePrice"
      :affordable-price="result.costs.affordablePrice"
      :target-date="store.config.deposit.targetDate"
    />

    <!-- Projections Dashboard -->
    <div class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="text-amber-500" />
          Projections
        </h2>
        <div class="text-right">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Est. Deposit</span>
          <div class="text-2xl font-black text-emerald-600 leading-none">
            {{ formatCurrency(smartResult.finalDeposit) }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Assets Growth -->
        <UCard class="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <template #header>
            <div class="flex items-center gap-2 text-sm font-bold text-gray-700">
              <UIcon name="i-heroicons-circle-stack" class="text-blue-500" />
              Assets Growth
            </div>
          </template>
          <AssetsChart 
            :series="chartSeries" 
            :emergency-target="store.config.budget.emergencyTarget"
          />
        </UCard>

        <!-- Cash Flow -->
        <UCard class="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <template #header>
            <div class="flex items-center gap-2 text-sm font-bold text-gray-700">
              <UIcon name="i-heroicons-arrow-trending-up" class="text-emerald-500" />
              Monthly Cash Flow
            </div>
          </template>
          <CashFlowChart :series="chartSeries" />
        </UCard>

        <!-- Budget Projection -->
        <UCard class="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <template #header>
            <div class="flex items-center gap-2 text-sm font-bold text-gray-700">
              <UIcon name="i-heroicons-chart-pie" class="text-orange-500" />
              Budget Sustainability
            </div>
          </template>
          <BudgetProjectionChart :series="chartSeries" />
        </UCard>

        <!-- Income Breakdown -->
        <UCard class="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <template #header>
            <div class="flex items-center gap-2 text-sm font-bold text-gray-700">
              <UIcon name="i-heroicons-currency-dollar" class="text-indigo-500" />
              Income Capacity
            </div>
          </template>
          <IncomeBreakdownChart :series="chartSeries" />
        </UCard>
      </div>
      
      <p v-if="hasPartialMonthExcluded" class="text-center text-[10px] text-gray-400">
        Charts show full months only • Deposit calculated to {{ exactTargetDateLabel }}
      </p>
    </div>

    <!-- Quick Links to Strategy -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UButton 
        to="/menu/bank" 
        variant="soft" 
        color="neutral" 
        block 
        class="py-4 rounded-2xl"
        icon="i-heroicons-building-library"
      >
        Bank Simulator
      </UButton>
      <UButton 
        to="/menu/costs" 
        variant="soft" 
        color="neutral" 
        block 
        class="py-4 rounded-2xl"
        icon="i-heroicons-calculator"
      >
        Purchase Costs
      </UButton>
      <UButton 
        to="/menu/income" 
        variant="soft" 
        color="neutral" 
        block 
        class="py-4 rounded-2xl"
        icon="i-heroicons-user-group"
      >
        Income Strategy
      </UButton>
    </div>
  </div>
</template>

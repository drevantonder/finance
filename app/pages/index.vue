<template>
  <div class="space-y-8">
    <!-- Formula Hero -->
    <FormulaHero
      :projected-deposit="store.projectedDeposit"
      :borrowing-capacity="result.borrowingCapacity"
      :max-purchase-price="result.maxPurchasePrice"
      :affordable-price="result.costs.affordablePrice"
      :target-date="store.config.deposit.targetDate"
    />

    <!-- Projection Charts Section -->
    <div class="rounded-2xl bg-linear-to-br from-emerald-50 to-blue-50 p-6 shadow-lg space-y-8">
       <div class="flex items-center justify-between">
         <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
           <UIcon name="i-heroicons-chart-bar-square" class="text-emerald-600" />
           Future Projections
         </h2>
          <div class="text-right">
            <div class="text-3xl font-extrabold text-emerald-700">{{ formatCurrency(smartResult.finalDeposit) }}</div>
            <div class="text-xs text-gray-500">Projected Deposit by {{ targetDateLabel }}</div>
            <div v-if="hasPartialMonthExcluded" class="text-[10px] text-gray-400 mt-1">
              Chart shows full months only • Deposit calculated to {{ exactTargetDateLabel }}
            </div>
          </div>
        </div>


       <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
         <div class="bg-white/50 p-4 rounded-xl border border-white/20">
           <h4 class="text-xs font-semibold text-gray-600 mb-4 uppercase tracking-wide flex items-center gap-2">
             <UIcon name="i-heroicons-banknotes" />
             Assets
           </h4>
           <AssetsChart 
             :series="chartSeries" 
             :emergency-target="store.config.budget.emergencyTarget"
           />
         </div>

         <div class="bg-white/50 p-4 rounded-xl border border-white/20">
           <h4 class="text-xs font-semibold text-gray-600 mb-4 uppercase tracking-wide flex items-center gap-2">
             <UIcon name="i-heroicons-currency-dollar" />
             Income Breakdown & TMN
           </h4>
           <IncomeBreakdownChart :series="chartSeries" />
         </div>

         <div class="bg-white/50 p-4 rounded-xl border border-white/20">
           <BudgetProjectionChart :series="chartSeries" />
         </div>

         <div class="bg-white/50 p-4 rounded-xl border border-white/20">
           <h4 class="text-xs font-semibold text-gray-600 mb-4 uppercase tracking-wide flex items-center gap-2">
             <UIcon name="i-heroicons-arrow-trending-up" />
             Monthly Cash Flow
           </h4>
           <CashFlowChart :series="chartSeries" />
         </div>
       </div>
    </div>

    <!-- Household Card -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user-group" class="text-primary-600" />
            <span class="font-bold">Household & Income</span>
          </div>
          <UButton to="/household" variant="link" color="primary" size="xs" trailing-icon="i-heroicons-arrow-right">
            Manage
          </UButton>
        </div>
      </template>

      <div class="space-y-6">
        <IncomeSourceCard v-for="source in store.config.incomeSources" :key="source.id" :source="source" />

        <!-- Empty state -->
        <div v-if="store.config.incomeSources.length === 0" class="text-center py-4 bg-gray-50 rounded-lg">
           <p class="text-xs text-gray-500">No household members or income sources configured.</p>
           <UButton to="/household" label="Setup Household" variant="link" size="xs" />
        </div>
      </div>
    </UCard>

    <!-- Details Panel -->
    <div class="rounded-xl bg-white p-6 shadow">
      <h3 class="flex items-center justify-between text-sm font-medium text-gray-700 mb-4">
        <span>Assessment Details</span>
        <UBadge 
          :label="result.limitingFactor === 'DTI' ? 'Capped by DTI' : 'Capped by Serviceability'" 
          :color="result.limitingFactor === 'DTI' ? 'warning' : 'error'"
          variant="soft" size="xs"
        />
      </h3>

      <!-- Comparison Bar -->
      <div class="mb-6 space-y-3">
        <!-- Serviceability Bar -->
        <div class="relative">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600">Serviceability Limit</span>
            <span class="font-medium" :class="result.limitingFactor === 'Serviceability' ? 'text-red-600' : 'text-gray-900'">
              {{ formatCurrency(result.serviceabilityCapacity) }}
            </span>
          </div>
          <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full transition-all duration-500"
              :class="result.limitingFactor === 'Serviceability' ? 'bg-red-500' : 'bg-gray-300'"
              :style="{ width: Math.min(100, (result.serviceabilityCapacity / Math.max(result.dtiCapacity, result.serviceabilityCapacity)) * 100) + '%' }"
            />
          </div>
          <p v-if="result.limitingFactor === 'Serviceability'" class="text-[10px] text-red-600 mt-1">
            Limited by monthly surplus cash flow
          </p>
        </div>

        <!-- DTI Bar -->
        <div class="relative">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600">DTI Limit ({{ store.config.loan.dtiCap }}x)</span>
            <span class="font-medium" :class="result.limitingFactor === 'DTI' ? 'text-orange-600' : 'text-gray-900'">
              {{ formatCurrency(result.dtiCapacity) }}
            </span>
          </div>
          <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
             <div 
              class="h-full rounded-full transition-all duration-500"
              :class="result.limitingFactor === 'DTI' ? 'bg-orange-500' : 'bg-gray-300'"
              :style="{ width: Math.min(100, (result.dtiCapacity / Math.max(result.dtiCapacity, result.serviceabilityCapacity)) * 100) + '%' }"
            />
          </div>
           <p v-if="result.limitingFactor === 'DTI'" class="text-[10px] text-orange-600 mt-1">
            Limited by total debt level (Regulation)
          </p>
        </div>
      </div>
      
      <div class="space-y-3 border-t border-gray-100 pt-4">
        <!-- Actual Repayment -->
        <div class="flex justify-between items-center group">
          <span class="text-sm text-gray-600">Actual Repayment</span>
          <div class="text-right">
            <span class="block text-lg font-semibold text-gray-900 leading-none">
              {{ formatCurrency(result.monthlyRepayment) }}
            </span>
            <span class="text-xs text-gray-500">
               {{ (store.config.loan.interestRate * 100).toFixed(2) }}% interest
            </span>
          </div>
        </div>

        <!-- Stress Test Repayment -->
        <div class="flex justify-between items-center border-t border-gray-100 pt-2">
          <span class="text-sm text-gray-600">Stress Test Repayment</span>
          <div class="text-right">
            <span class="block text-base font-medium text-gray-700 leading-none">
              {{ formatCurrency(result.stressRepayment) }}
            </span>
            <span class="text-xs text-orange-600 font-medium">
               @ {{ (result.stressRate * 100).toFixed(2) }}% stress rate
            </span>
          </div>
        </div>

        <div class="flex justify-between items-center border-t border-gray-100 pt-2">
          <span class="text-sm text-gray-600">Net Household Income</span>
          <span class="text-lg font-semibold text-gray-900">
            {{ formatCurrency(result.assessedIncome) }}<span class="text-sm font-normal text-gray-500">/mo</span>
          </span>
        </div>

        <div class="flex justify-between items-center text-xs text-gray-500 -mt-1">
          <span>(Inc. Spouse Net: {{ formatCurrency(result.breakdown.spouseNet) }})</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">DTI Ratio</span>
          <span class="text-lg font-semibold text-gray-900">
            {{ result.dtiRatio }}x
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency, formatDateLabel } from '~/composables/useFormatter'
import { useStockPrices } from '~/composables/useStockPrices'
import { useProjectionResults } from '~/composables/useProjectionResults'
import type { IncomeType } from '~/types'

const store = useSessionStore()
const stockPrices = useStockPrices()
const { 
  borrowingResult: result, 
  smartResult, 
  chartSeries, 
  hasPartialMonthExcluded, 
  targetDateLabel, 
  exactTargetDateLabel 
} = useProjectionResults()
</script>

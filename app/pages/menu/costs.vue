<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatter'
import { useProjectionResults } from '~/composables/useProjectionResults'

const store = useSessionStore()
const { borrowingResult: result } = useProjectionResults()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Purchase Costs</h2>
      <p class="text-sm text-gray-500">Calculate stamp duty and upfront fees</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Config -->
      <div class="space-y-6">
        <div class="rounded-xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <h3 class="font-bold flex items-center gap-2">
            <UIcon name="i-heroicons-identification" class="text-primary-600" />
            Eligibility
          </h3>
          
          <div class="flex items-center justify-between py-2">
            <div>
              <p class="text-sm font-medium">First Home Buyer</p>
              <p class="text-xs text-gray-500">Enable QLD stamp duty concessions</p>
            </div>
            <USwitch v-model="store.config.costs.isFirstHomeBuyer" />
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium mb-1">Property Type</label>
            <div class="flex gap-2">
              <button
                v-for="type in (['existing', 'new'] as const)"
                :key="type"
                @click="store.config.costs.propertyType = type"
                class="flex-1 rounded-lg border py-2 text-sm font-medium transition-all capitalize"
                :class="store.config.costs.propertyType === type 
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-900 dark:text-primary-100' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'"
              >
                {{ type }}
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
          <h3 class="font-bold flex items-center gap-2">
            <UIcon name="i-heroicons-calculator" class="text-primary-600" />
            Other Upfront Fees
          </h3>
          
          <SmartSlider
            label="Legal / Solicitor Fees"
            v-model="store.config.costs.legalCosts"
            :min="1000"
            :max="5000"
            :step="100"
            currency
          />

          <SmartSlider
            label="Building & Pest"
            v-model="store.config.costs.buildingAndPest"
            :min="0"
            :max="2000"
            :step="50"
            currency
          />

          <SmartSlider
            label="Govt Registration Fees"
            v-model="store.config.costs.otherGovtCosts"
            :min="500"
            :max="3000"
            :step="50"
            currency
          />
        </div>
      </div>

      <!-- Results -->
      <div class="space-y-6">
        <div class="rounded-xl bg-white dark:bg-gray-900 shadow-lg overflow-hidden border border-gray-100 dark:border-gray-800">
          <div class="bg-primary-600 p-6 text-white text-center">
            <p class="text-sm opacity-80 font-medium uppercase tracking-wider">Affordable House Price</p>
            <h3 class="text-4xl font-bold mt-1">{{ formatCurrency(result.costs.affordablePrice) }}</h3>
            <p class="text-xs mt-2 opacity-80">After all upfront costs are paid</p>
          </div>

          <div class="p-6 space-y-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500 font-medium">Total Budget (Loan + Deposit)</span>
              <span class="font-bold">{{ formatCurrency(result.maxPurchasePrice) }}</span>
            </div>
            
            <div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Stamp Duty (Transfer Duty)</span>
                <span class="text-red-600 font-medium">- {{ formatCurrency(result.costs.stampDuty) }}</span>
              </div>
              <div v-if="result.costs.concessionApplied" class="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-[11px] font-bold">
                <span>FHB CONCESSION APPLIED</span>
                <span>Saved {{ formatCurrency(result.costs.concessionAmount) }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Legal & Professional</span>
                <span class="text-red-600 font-medium">- {{ formatCurrency(store.config.costs.legalCosts) }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Inspections & Registration</span>
                <span class="text-red-600 font-medium">- {{ formatCurrency(store.config.costs.buildingAndPest + store.config.costs.otherGovtCosts) }}</span>
              </div>
            </div>

            <div class="border-t border-gray-100 dark:border-gray-800 my-2"></div>

            <div class="flex justify-between items-center pt-2">
              <span class="text-sm font-bold">Total Upfront Costs</span>
              <span class="text-lg font-bold">{{ formatCurrency(result.costs.totalCosts) }}</span>
            </div>

            <div class="mt-6">
              <div class="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full flex overflow-hidden">
                <div 
                  class="h-full bg-primary-500" 
                  :style="{ width: (result.costs.affordablePrice / result.maxPurchasePrice * 100) + '%' }"
                  title="House Price"
                />
                <div 
                  class="h-full bg-red-400" 
                  :style="{ width: (result.costs.totalCosts / result.maxPurchasePrice * 100) + '%' }"
                  title="Costs"
                />
              </div>
              <div class="flex justify-between text-[10px] text-gray-400 mt-1.5 font-medium uppercase tracking-tighter">
                <span>House: {{ (result.costs.affordablePrice / result.maxPurchasePrice * 100).toFixed(1) }}%</span>
                <span>Fees: {{ (result.costs.totalCosts / result.maxPurchasePrice * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
          <p class="font-bold mb-1 flex items-center gap-1">
            <UIcon name="i-heroicons-information-circle" />
            Iterative Solver Active
          </p>
          We automatically calculate the exact stamp duty for your affordable price range. As your costs go up, your affordable price goes down, which in turn might lower your stamp duty. We repeat this calculation until it balances perfectly.
        </div>
      </div>
    </div>
  </div>
</template>

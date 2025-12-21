<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Purchase Costs</h2>
        <p class="text-sm text-gray-500">Calculate stamp duty and upfront fees</p>
      </div>
      <NuxtLink to="/" class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
        <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Main Settings -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left Column: Config -->
      <div class="space-y-6">
        <div class="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 class="font-bold text-gray-900 flex items-center gap-2">
            <UIcon name="i-heroicons-identification" class="text-primary-600" />
            Eligibility
          </h3>
          
          <div class="flex items-center justify-between py-2">
            <div>
              <p class="text-sm font-medium text-gray-900">First Home Buyer</p>
              <p class="text-xs text-gray-500">Enable QLD stamp duty concessions</p>
            </div>
            <USwitch v-model="store.config.costs.isFirstHomeBuyer" />
          </div>

          <div class="space-y-1">
             <label class="block text-sm font-medium text-gray-900 mb-1">Property Type</label>
             <div class="flex gap-2">
              <button
                v-for="type in (['existing', 'new'] as const)"
                :key="type"
                @click="store.config.costs.propertyType = type"
                class="flex-1 rounded-lg border py-2 text-sm font-medium transition-all capitalize"
                :class="store.config.costs.propertyType === type 
                  ? 'border-primary-600 bg-primary-50 text-primary-900' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'"
              >
                {{ type }}
              </button>
            </div>
            <p v-if="store.config.costs.propertyType === 'new'" class="text-[10px] text-orange-600 mt-1">
              Note: New home concessions often have different limits.
            </p>
          </div>
        </div>

        <div class="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-6">
          <h3 class="font-bold text-gray-900 flex items-center gap-2">
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

      <!-- Right Column: Results -->
      <div class="space-y-6">
        <div class="rounded-xl bg-white shadow-lg overflow-hidden border border-gray-100">
          <div class="bg-primary-600 p-6 text-white text-center">
            <p class="text-sm opacity-80 font-medium uppercase tracking-wider">Affordable House Price</p>
            <h3 class="text-4xl font-bold mt-1">{{ formatCurrency(result.costs.affordablePrice) }}</h3>
            <p class="text-xs mt-2 opacity-80">After all upfront costs are paid</p>
          </div>

          <div class="p-6 space-y-4">
             <div class="flex justify-between text-sm">
              <span class="text-gray-500 font-medium">Total Budget (Loan + Deposit)</span>
              <span class="text-gray-900 font-bold">{{ formatCurrency(result.maxPurchasePrice) }}</span>
            </div>
            
            <div class="border-t border-gray-100 my-2"></div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Stamp Duty (Transfer Duty)</span>
                <span class="text-red-600 font-medium">- {{ formatCurrency(result.costs.stampDuty) }}</span>
              </div>
              <div v-if="result.costs.concessionApplied" class="flex justify-between items-center bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[11px] font-bold">
                 <span>FHB CONCESSION APPLIED</span>
                 <span>Saved {{ formatCurrency(result.costs.concessionAmount) }}</span>
              </div>
              <div v-else-if="store.config.costs.isFirstHomeBuyer && result.costs.affordablePrice > 800000" class="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">
                Note: FHB concession phased out above $800k.
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Legal & Professional</span>
                <span class="text-red-600 font-medium">- {{ formatCurrency(store.config.costs.legalCosts) }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Inspections & Registration</span>
                <span class="text-red-600 font-medium">- {{ formatCurrency(store.config.costs.buildingAndPest + store.config.costs.otherGovtCosts) }}</span>
              </div>
            </div>

            <div class="border-t border-gray-100 my-2"></div>

            <div class="flex justify-between items-center pt-2">
              <span class="text-sm font-bold text-gray-900">Total Upfront Costs</span>
              <span class="text-lg font-bold text-gray-900">{{ formatCurrency(result.costs.totalCosts) }}</span>
            </div>

            <div class="mt-6">
              <div class="h-3 w-full bg-gray-100 rounded-full flex overflow-hidden">
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

        <div class="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800 leading-relaxed">
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

<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatter'
import { useProjectionResults } from '~/composables/useProjectionResults'

const store = useSessionStore()
const { borrowingResult: result } = useProjectionResults()
</script>


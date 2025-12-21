<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Bank Transparency</h2>
        <p class="text-sm text-gray-500">See exactly how your limit is calculated</p>
      </div>
      <NuxtLink to="/" class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
        <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Global Parameters -->
    <div class="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SmartSlider
          label="Base Interest Rate"
          v-model="interestRatePercent"
          :min="1.0"
          :max="10.0"
          :step="0.01"
          tooltip="The actual interest rate you expect to pay."
        />
        
        <div>
           <label class="block text-sm font-medium text-gray-900 mb-1">Loan Term</label>
           <div class="flex gap-2">
            <button
              v-for="term in [25, 30]"
              :key="term"
              @click="store.config.loan.loanTerm = term"
              class="flex-1 rounded-lg border py-2 text-sm font-medium transition-all"
              :class="store.config.loan.loanTerm === term 
                ? 'border-primary-600 bg-primary-50 text-primary-900' 
                : 'border-gray-200 hover:border-gray-300 text-gray-600'"
            >
              {{ term }} Years
            </button>
          </div>
          <p class="text-[10px] text-gray-400 mt-1.5">
            Assessment Rate: <span class="font-medium text-gray-900">{{ (result.stressRate * 100).toFixed(2) }}%</span> (Rate + 3.00% Buffer)
          </p>
        </div>
      </div>
    </div>

    <!-- Two-Column Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- 1. Serviceability Limit (Cash Flow) -->
      <div class="space-y-4">
        <div class="rounded-xl bg-white border-t-4 border-red-500 shadow p-5">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h3 class="font-bold text-gray-900">1. Serviceability Limit</h3>
              <p class="text-xs text-gray-500">Based on monthly surplus cash flow</p>
            </div>
            <div class="text-right">
              <span class="block text-2xl font-bold text-gray-900">{{ formatCurrency(result.serviceabilityCapacity) }}</span>
              <span v-if="result.limitingFactor === 'Serviceability'" class="text-[10px] font-bold text-error-600 bg-error-50 px-2 py-0.5 rounded-full">LIMITING FACTOR</span>
            </div>
          </div>

          <!-- Settings -->
          <div class="mb-6">
            <SmartSlider
              label="Monthly Expenses (HEM)"
              v-model="store.config.loan.baseExpenses"
              :min="2000"
              :max="8000"
              :step="100"
              currency
            />
          </div>

          <!-- The Math -->
          <div class="bg-gray-50 rounded-lg p-3 text-xs space-y-3 border border-gray-100">
            
            <!-- Income Section -->
            <div class="space-y-1">
              <p class="font-semibold text-gray-700 border-b border-gray-200 pb-1">Monthly Income (Net)</p>
              <div v-for="source in activeIncomes" :key="source.id" class="flex justify-between">
                <span class="text-gray-600">
                  {{ source.name }}
                  <span v-if="source.type === 'centrelink'" class="text-[10px] text-amber-600">(Excluded from Capacity)</span>
                </span>
                <span class="font-medium" :class="source.type === 'centrelink' ? 'text-gray-400 line-through' : 'text-gray-900'">
                  {{ formatCurrency(getSourceNet(source)) }}
                </span>
              </div>
              <div class="flex justify-between pt-1 border-t border-gray-200 font-medium bg-gray-100/50 -mx-1 px-1">
                <span class="text-gray-900">Total Net Income (Assessed)</span>
                <span class="text-gray-900">{{ formatCurrency(result.assessedIncome + result.hecsMonthlyImpact) }}</span>
              </div>
            </div>


            <!-- Expenses Section -->
             <div class="space-y-1">
              <p class="font-semibold text-gray-700 border-b border-gray-200 pb-1 pt-1">Monthly Dedutions</p>
              <div class="flex justify-between text-red-600/80">
                <span>Living Expenses (HEM)</span>
                <span>- {{ formatCurrency(store.config.loan.baseExpenses) }}</span>
              </div>
              <div v-if="result.hecsMonthlyImpact > 0" class="flex justify-between text-red-600/80">
                <span>Household HECS Repayment</span>
                <span>- {{ formatCurrency(result.hecsMonthlyImpact) }}</span>
              </div>
            </div>

            <div class="border-t border-gray-200 my-2"></div>
            <div class="flex justify-between font-bold text-sm">
              <span class="text-gray-900">Monthly Surplus</span>
              <span class="text-primary-600">= {{ formatCurrency(result.monthlySurplus) }}</span>
            </div>
            
            <div class="mt-2 pt-2 border-t border-dashed border-gray-200 text-[10px] text-gray-500">
               <p v-if="result.hecsMonthlyImpact > 0" class="mb-1 italic">Note: HECS is calculated at household-person level for accuracy.</p>
               <p>Borrowing Power calculation: <br> Surplus / (Stress Rate adjusted monthly factor)</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. DTI Limit (Debt Cap) -->
      <div class="space-y-4">
        <div class="rounded-xl bg-white border-t-4 border-orange-500 shadow p-5">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h3 class="font-bold text-gray-900">2. DTI Limit</h3>
              <p class="text-xs text-gray-500">Debt-to-Income / Regulatory Cap</p>
            </div>
            <div class="text-right">
              <span class="block text-2xl font-bold text-gray-900">{{ formatCurrency(result.dtiCapacity) }}</span>
              <span v-if="result.limitingFactor === 'DTI'" class="text-[10px] font-bold text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full">LIMITING FACTOR</span>
            </div>
          </div>

          <!-- Settings -->
          <div class="mb-6">
             <SmartSlider
              label="DTI Cap (Multiple)"
              v-model="store.config.loan.dtiCap"
              :min="3.0"
              :max="9.0"
              :step="0.1"
            />
          </div>

          <!-- The Math -->
          <div class="bg-gray-50 rounded-lg p-3 text-xs space-y-3 border border-gray-100">
             <!-- Income Breakdown -->
            <div class="space-y-1">
              <p class="font-semibold text-gray-700 border-b border-gray-200 pb-1">Annual Gross Income</p>
              <div class="flex justify-between">
                <span class="text-gray-600">Applicant Taxable</span>
                <span class="font-medium text-gray-900">{{ formatCurrency(result.breakdown.grossTaxableAnnual) }}</span>
              </div>
              <div class="flex justify-between">
                 <span class="text-gray-600">Assessed MFB <span class="text-[10px] text-gray-400">(Gross)</span></span>
                 <span class="font-medium text-gray-900">{{ formatCurrency(result.breakdown.grossMfbAnnual) }}</span>
              </div>
              <div v-if="result.breakdown.spouseGrossAnnual > 0" class="flex justify-between">
                <span class="text-gray-600">Spouse Gross Income</span>
                <span class="font-medium text-gray-900">{{ formatCurrency(result.breakdown.spouseGrossAnnual) }}</span>
              </div>
              <div class="flex justify-between pt-1 border-t border-gray-200 font-medium bg-gray-100/50 -mx-1 px-1">
                <span class="text-gray-900">Total Assessable</span>
                <span class="text-gray-900">{{ formatCurrency(result.grossAnnualIncome) }}</span>
              </div>
            </div>

            <div class="space-y-1 pt-1">
               <div class="flex justify-between items-center">
                <span class="text-gray-600">Multiplied by Cap</span>
                <span class="font-medium text-orange-600">x {{ store.config.loan.dtiCap }}</span>
              </div>
              <div class="flex justify-between items-center text-gray-500 text-[10px] italic">
                <span>Max Total Debt</span>
                <span>{{ formatCurrency(result.grossAnnualIncome * store.config.loan.dtiCap) }}</span>
              </div>
            </div>

            <div v-if="result.breakdown.existingDebt > 0" class="space-y-3 pt-3 border-t border-dashed border-gray-200">
               <p class="font-semibold text-gray-700">Projected HECS Breakdown</p>
               <div v-for="p in result.breakdown.people" :key="p.name" class="space-y-1">
                 <div v-if="p.currentHecs > 0" class="bg-white p-2 rounded border border-gray-100">
                   <div class="flex justify-between font-medium">
                     <span>{{ p.name }}</span>
                     <span>{{ formatCurrency(p.projectedHecs) }}</span>
                   </div>
                   <div class="grid grid-cols-1 text-[9px] text-gray-400">
                     <div class="flex justify-between italic">
                       <span>Current Balance:</span>
                       <span>{{ formatCurrency(p.currentHecs) }}</span>
                     </div>
                     <div class="flex justify-between text-emerald-600">
                       <span>Est. Repayments:</span>
                       <span>-{{ formatCurrency(p.repaymentsDuringJourney) }}</span>
                     </div>
                     <div class="flex justify-between text-red-400">
                       <span>Est. Indexation:</span>
                       <span>+{{ formatCurrency(p.indexationDuringJourney) }}</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div class="flex justify-between items-center text-orange-600 font-bold">
                <span>Total Projected Debt</span>
                <span>- {{ formatCurrency(result.breakdown.existingDebt) }}</span>
              </div>
            </div>

            <div class="border-t border-gray-200 my-2"></div>
            <div class="flex justify-between font-bold text-sm">
              <span class="text-gray-900">DTI Limit</span>
              <span class="text-orange-600">= {{ formatCurrency(result.dtiCapacity) }}</span>
            </div>

            <div class="mt-2 pt-2 border-t border-dashed border-gray-200 text-[10px] text-gray-500">
              <p>Formula: (Gross Assessment Income × DTI Cap) - Existing Debts</p>
              <p class="mt-1 italic">Note: Existing debts use projected HECS balances at target date.</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Assumptions Disclaimer -->
    <div class="rounded-lg bg-gray-50 border border-gray-200 p-4">
      <div class="flex gap-3">
        <UIcon name="i-heroicons-information-circle" class="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
        <div class="text-xs text-gray-500 space-y-2">
          <p class="font-medium text-gray-700">Calculation Assumptions</p>
          <ul class="list-disc pl-4 space-y-1">
            <li><strong>HECS Thresholds:</strong> For projections beyond June 2026, 2025-26 repayment thresholds are used as an approximation. Actual thresholds are indexed annually by CPI.</li>
            <li><strong>Tax Rates:</strong> Calculations use 2024-25 Stage 3 tax brackets, which are stable through 2027.</li>
            <li><strong>Stamp Duty:</strong> QLD First Home Buyer concessions reflect current policy, including the May 2025 full exemption for new homes.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatter'
import { calculateSourceNetMonthly } from '~/composables/useLoanCalculator'
import { getActiveIncomeSources } from '~/composables/useDateUtils'
import { useProjectionResults } from '~/composables/useProjectionResults'
import type { IncomeSource } from '~/types'

const store = useSessionStore()
const { borrowingResult: result } = useProjectionResults()

const activeIncomes = computed(() => {
  const targetDate = new Date(store.config.deposit.targetDate)
  return getActiveIncomeSources(store.config.incomeSources, targetDate)
})

const interestRatePercent = computed({
  get: () => store.config.loan.interestRate * 100,
  set: (val) => store.config.loan.interestRate = val / 100
})

function getSourceNet(source: IncomeSource) {
  const targetDate = new Date(store.config.deposit.targetDate)
  return calculateSourceNetMonthly(source, undefined, targetDate, store.config.people)
}
</script>

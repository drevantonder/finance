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

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold">Bank Transparency</h2>
      <p class="text-sm text-gray-500">See exactly how your limit is calculated</p>
    </div>

    <!-- Global Parameters -->
    <div class="rounded-xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800">
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
          <label class="block text-sm font-medium mb-1">Loan Term</label>
          <div class="flex gap-2">
            <button
              v-for="term in [25, 30]"
              :key="term"
              @click="store.config.loan.loanTerm = term"
              class="flex-1 rounded-lg border py-2 text-sm font-medium transition-all"
              :class="store.config.loan.loanTerm === term 
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-900 dark:text-primary-100' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'"
            >
              {{ term }} Years
            </button>
          </div>
          <p class="text-[10px] text-gray-400 mt-1.5">
            Assessment Rate: <span class="font-medium text-gray-900 dark:text-white">{{ (result.stressRate * 100).toFixed(2) }}%</span> (Rate + 3.00% Buffer)
          </p>
        </div>
      </div>
    </div>

    <!-- Two-Column Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- 1. Serviceability Limit -->
      <div class="space-y-4">
        <div class="rounded-xl bg-white dark:bg-gray-900 border-t-4 border-red-500 shadow p-5">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h3 class="font-bold">1. Serviceability Limit</h3>
              <p class="text-xs text-gray-500">Based on monthly surplus cash flow</p>
            </div>
            <div class="text-right">
              <span class="block text-2xl font-bold">{{ formatCurrency(result.serviceabilityCapacity) }}</span>
              <span v-if="result.limitingFactor === 'Serviceability'" class="text-[10px] font-bold text-error-600 bg-error-50 dark:bg-error-950/30 px-2 py-0.5 rounded-full">LIMITING FACTOR</span>
            </div>
          </div>

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
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs space-y-3 border border-gray-100 dark:border-gray-700">
            <div class="space-y-1">
              <p class="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Monthly Income (Net)</p>
              <div v-for="source in activeIncomes" :key="source.id" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">
                  {{ source.name }}
                  <span v-if="source.type === 'centrelink'" class="text-[10px] text-amber-600">(Excluded)</span>
                </span>
                <span class="font-medium" :class="source.type === 'centrelink' ? 'text-gray-400 line-through' : ''">
                  {{ formatCurrency(getSourceNet(source)) }}
                </span>
              </div>
              <div class="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-medium bg-gray-100/50 dark:bg-gray-700/50 -mx-1 px-1">
                <span>Total Net Income (Assessed)</span>
                <span>{{ formatCurrency(result.assessedIncome + result.hecsMonthlyImpact) }}</span>
              </div>
            </div>

            <div class="space-y-1">
              <p class="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1 pt-1">Monthly Deductions</p>
              <div class="flex justify-between text-red-600/80">
                <span>Living Expenses (HEM)</span>
                <span>- {{ formatCurrency(store.config.loan.baseExpenses) }}</span>
              </div>
              <div v-if="result.hecsMonthlyImpact > 0" class="flex justify-between text-red-600/80">
                <span>Household HECS Repayment</span>
                <span>- {{ formatCurrency(result.hecsMonthlyImpact) }}</span>
              </div>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div class="flex justify-between font-bold text-sm">
              <span>Monthly Surplus</span>
              <span class="text-primary-600">= {{ formatCurrency(result.monthlySurplus) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. DTI Limit -->
      <div class="space-y-4">
        <div class="rounded-xl bg-white dark:bg-gray-900 border-t-4 border-orange-500 shadow p-5">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h3 class="font-bold">2. DTI Limit</h3>
              <p class="text-xs text-gray-500">Debt-to-Income / Regulatory Cap</p>
            </div>
            <div class="text-right">
              <span class="block text-2xl font-bold">{{ formatCurrency(result.dtiCapacity) }}</span>
              <span v-if="result.limitingFactor === 'DTI'" class="text-[10px] font-bold text-warning-600 bg-warning-50 dark:bg-warning-950/30 px-2 py-0.5 rounded-full">LIMITING FACTOR</span>
            </div>
          </div>

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
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs space-y-3 border border-gray-100 dark:border-gray-700">
            <div class="space-y-1">
              <p class="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Annual Gross Income</p>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Applicant Taxable</span>
                <span class="font-medium">{{ formatCurrency(result.breakdown.grossTaxableAnnual) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Assessed MFB <span class="text-[10px] text-gray-400">(Gross)</span></span>
                <span class="font-medium">{{ formatCurrency(result.breakdown.grossMfbAnnual) }}</span>
              </div>
              <div v-if="result.breakdown.spouseGrossAnnual > 0" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Spouse Gross Income</span>
                <span class="font-medium">{{ formatCurrency(result.breakdown.spouseGrossAnnual) }}</span>
              </div>
              <div class="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-medium bg-gray-100/50 dark:bg-gray-700/50 -mx-1 px-1">
                <span>Total Assessable</span>
                <span>{{ formatCurrency(result.grossAnnualIncome) }}</span>
              </div>
            </div>

            <div class="space-y-1 pt-1">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Multiplied by Cap</span>
                <span class="font-medium text-orange-600">x {{ store.config.loan.dtiCap }}</span>
              </div>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div class="flex justify-between font-bold text-sm">
              <span>DTI Limit</span>
              <span class="text-orange-600">= {{ formatCurrency(result.dtiCapacity) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/household" />
        <h1 class="text-xl font-bold truncate">{{ source?.name || 'Edit Income' }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton 
          icon="i-heroicons-trash" 
          color="error" 
          variant="ghost" 
          label="Delete" 
          @click="handleDelete" 
        />
      </div>
    </div>

    <div v-if="!source" class="text-center py-20">
      <p class="text-gray-500">Income source not found.</p>
      <UButton to="/household" label="Back to Household" class="mt-4" />
    </div>

    <div v-else class="space-y-6">
      <!-- 0. General Info -->
      <UCard>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Label / Name</label>
            <UInput v-model="source.name" placeholder="e.g. My TMN, Sarah's Job" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Household Member</label>
            <USelect 
              v-model="source.personId" 
              :items="store.config.people" 
              label-key="name" 
              value-key="id"
            />
          </div>
          <div class="space-y-1">
             <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Start & End Dates</label>
             <div class="flex items-center gap-2">
                <UInput v-model="source.startDate" type="date" class="flex-1" />
                <span class="text-gray-400">→</span>
                <UInput v-model="source.endDate" type="date" class="flex-1" />
             </div>
             <p class="text-[10px] text-gray-400 italic">Leave empty for "Always Active"</p>
          </div>
          <div v-if="source.type !== 'centrelink'" class="space-y-1">
            <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Payment Day of Month</label>
            <UInput v-model="source.paymentDayOfMonth" type="number" min="1" max="31" />
            <p class="text-[10px] text-gray-400">Day you typically get paid (e.g. 5 for TMN)</p>
          </div>
        </div>
      </UCard>

      <!-- TMN SPECIFIC FLOW (RESTORED LAYOUT) -->
      <div v-if="source.type === 'tmn' && source.tmn" class="space-y-6">
        
        <!-- TMN Slider (Top) -->
        <UCard>
          <div class="space-y-4">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-gray-700 uppercase tracking-wider">Total Monthly Needs (Target)</label>
              <span class="text-3xl font-bold text-primary-600">{{ fmt(source.tmn.targetAmount) }}</span>
            </div>
            <TmnSlider v-model="source.tmn.targetAmount" compact />
             <div class="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-50">
               <div class="flex items-center gap-4">
                 <div class="flex items-center gap-2">
                   <span class="text-gray-400 font-medium uppercase tracking-tighter">Current:</span>
                   <UInput v-model="source.tmn.currentAmount" type="number" size="xs" class="w-24" />
                 </div>
                 <div class="flex items-center gap-2">
                   <span class="text-amber-600 font-bold uppercase tracking-tighter">Committed:</span>
                   <UInput v-model="source.tmn.partnerCommitments" type="number" size="xs" class="w-24" color="warning" />
                 </div>
                 <div class="flex items-center gap-2 border-l border-gray-100 pl-4">
                   <span class="text-gray-400 font-medium uppercase tracking-tighter">Increase Every:</span>

                  <USelect 
                    v-model="source.tmn.increaseIntervalMonths"
                    size="xs"
                    class="w-28"
                    :items="[
                      { label: '3 months', value: 3 },
                      { label: '4 months', value: 4 },
                      { label: '6 months', value: 6 },
                      { label: '12 months', value: 12 }
                    ]"
                  />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-400 font-medium uppercase tracking-tighter">Target:</span>
                <span class="font-bold">{{ fmt(source.tmn.targetAmount) }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Bottom-Up Flow -->
        <div class="space-y-4">
          
          <!-- Taxable Income Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-blue-200"></div>
                <h2 class="text-lg">Taxable Income</h2>
              </div>
            </template>

            <div class="space-y-4">
              <!-- Amount Paid to Bank Account -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Amount Paid to Bank Account</label>
                <div class="text-right">
                  <div class="text-lg font-semibold text-gray-900">{{ fmt(bankAmount) }}</div>
                  <div class="text-xs text-gray-500">Calculated: Taxable - Tax - Post-Tax Super - HECS</div>
                </div>
              </div>

              <div class="border-t border-gray-100"></div>

              <!-- Post Tax Super -->
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700">Post Tax Super</label>
                <UInput
                  v-model="source.tmn.postTaxSuper"
                  type="number"
                  class="w-32"
                  align="right"
                />
              </div>

              <!-- Tax -->
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-2">
                     <label class="text-sm text-gray-700">Tax</label>
                     <UButton 
                        variant="link" 
                        size="xs" 
                        color="neutral" 
                        :icon="showTaxDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-information-circle'"
                        @click="showTaxDetails = !showTaxDetails"
                     >
                       {{ showTaxDetails ? 'Hide' : 'Show' }} Calc
                     </UButton>
                  </div>
                  
                  <div class="flex items-center">
                    <span class="text-gray-900 font-medium bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 min-w-[5rem] text-right">
                      {{ fmt(recommendedTax) }}
                    </span>
                    <span class="text-xs text-gray-400 ml-2 w-16">/month</span>
                  </div>
                </div>

                <!-- Detailed Tax Breakdown Panel -->
                 <div v-if="showTaxDetails" class="bg-gray-50 p-3 rounded-md text-xs border border-gray-200 -mx-2 mb-2">
                    <p class="font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">2027-28 Tax Calculation (Stage 3 Cuts)</p>
                    <div class="space-y-1">
                       <div class="flex justify-between">
                         <span class="text-gray-600">Annual Taxable Income:</span>
                         <span class="font-mono text-gray-900">{{ tmnBreakdown ? fmt(tmnBreakdown.taxableIncome * 12) : '$0' }}</span>
                       </div>
                       
                       <!-- Dynamic Bracket Highlight -->
                       <div class="pt-2 space-y-1 text-gray-500">
                         <div class="flex justify-between" :class="{'text-primary-600 font-medium': tmnBreakdown && (tmnBreakdown.taxableIncome * 12) > 18200}">
                           <span>Base Tax (Brackets):</span>
                           <span>{{ fmt(baseTax) }}</span>
                         </div>
                          <div class="flex justify-between" :class="{'text-primary-600 font-medium': tmnBreakdown && (tmnBreakdown.taxableIncome * 12) > 26000}">
                           <span>Medicare Levy (2%):</span>
                           <span>{{ fmt(medicareLevy) }}</span>
                         </div>
                         <div class="border-t border-gray-200 pt-1 mt-1 flex justify-between font-bold text-gray-900">
                           <span>Total Annual Tax:</span>
                           <span>{{ fmt(baseTax + medicareLevy) }}</span>
                         </div>
                          <div class="flex justify-between text-gray-500 italic">
                           <span>Monthly (÷12):</span>
                           <span>{{ fmt(Math.round((baseTax + medicareLevy) / 12)) }}</span>
                         </div>
                       </div>
                    </div>
                  </div>

               <div class="border-t-2 border-gray-100"></div>

              <!-- Taxable Income (calculated) -->
              <div class="flex items-center justify-between bg-blue-50/50 -mx-6 px-6 py-4 border-y border-blue-100">
                <label class="text-base font-bold text-blue-900 uppercase tracking-wide">Taxable Income</label>
                <div class="text-2xl font-black text-blue-600">{{ tmnBreakdown ? fmt(tmnBreakdown.taxableIncome) : '$0' }}</div>
              </div>
            </div>
          </UCard>

          <!-- MFB Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-success-200"></div>
                <h2 class="text-lg">MFB (Ministry Fringe Benefits)</h2>
              </div>
            </template>

            <div class="space-y-3">
              <!-- Housing (read-only for now) -->
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700">Housing (Estimated)</label>
                <div class="text-sm font-medium text-gray-900">{{ fmt(1083) }}</div>
              </div>

              <!-- Remaining MFBs -->
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700">Remaining MFB's</label>
                <div class="text-sm font-medium text-gray-900">{{ tmnBreakdown ? fmt(tmnBreakdown.mfb - 1083) : '$0' }}</div>
              </div>

              <div class="border-t border-gray-100"></div>

              <!-- Total MFB (calculated) -->
              <div class="flex items-center justify-between bg-success-50/50 -mx-6 px-6 py-4 border-y border-success-100">
                <label class="text-base font-bold text-success-900 uppercase tracking-wide">Total MFB</label>
                <div class="text-2xl font-black text-success-600">{{ tmnBreakdown ? fmt(tmnBreakdown.mfb) : '$0' }}</div>
              </div>
            </div>
          </UCard>

          <!-- Super Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-warning-200"></div>
                <h2 class="text-lg">Super</h2>
              </div>
            </template>

            <div class="space-y-3">
              <!-- Required Super -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-700">Required Super</label>
                  <UBadge color="neutral" variant="subtle" size="xs">11.5% of FP</UBadge>
                </div>
                <div class="text-sm font-medium text-gray-900">{{ tmnBreakdown ? fmt(tmnBreakdown.requiredSuper) : '$0' }}</div>
              </div>

              <!-- Optional Super (placeholder) -->
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-400">Optional Super</label>
                <div class="text-sm text-gray-400">$0</div>
              </div>
            </div>
          </UCard>

          <!-- FP Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-orange-200"></div>
                <h2 class="text-lg">Financial Package (FP)</h2>
              </div>
            </template>

            <div class="flex items-center justify-between bg-orange-50/50 -mx-6 px-6 py-5 border-y border-orange-100">
              <label class="text-lg font-bold text-orange-900 uppercase tracking-wide">Financial Package</label>
              <div class="text-3xl font-black text-orange-600">{{ tmnBreakdown ? fmt(tmnBreakdown.fp) : '$0' }}</div>
            </div>
          </UCard>

          <!-- Ministry Expenses Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-purple-200"></div>
                <h2 class="text-lg">Ministry Expenses</h2>
              </div>
            </template>

            <div class="space-y-3">
              <!-- MMR -->
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700">MMR (Ministry Maintenance Reserve)</label>
                <UInput
                  v-model="source.tmn.mmr"
                  type="number"
                  class="w-32"
                />
              </div>

              <!-- Strategy Levy -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-700">Strategy Levy</label>
                  <UBadge color="neutral" variant="subtle" size="xs">2% of (FP+MMR)</UBadge>
                </div>
                <div class="text-sm font-medium text-gray-900">{{ tmnBreakdown ? fmt(tmnBreakdown.strategyLevy) : '$0' }}</div>
              </div>

              <!-- Workers Comp -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-700">Workers' Comp</label>
                  <UBadge color="neutral" variant="subtle" size="xs">1.7% of FP</UBadge>
                </div>
                <div class="text-sm font-medium text-gray-900">{{ tmnBreakdown ? fmt(tmnBreakdown.workersComp) : '$0' }}</div>
              </div>
            </div>
          </UCard>

          <!-- Giving Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-pink-200"></div>
                <h2 class="text-lg">Giving</h2>
              </div>
            </template>

            <div class="space-y-3">
              <!-- Total Giving Input -->
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700">Total Monthly Giving</label>
                <UInput
                  v-model="source.tmn.giving"
                  type="number"
                  class="w-32"
                />
              </div>

              <p class="text-xs text-gray-500 italic">
                Includes giving to individuals and ministries within PTC
              </p>
            </div>
          </UCard>

          <!-- Levy & Total Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2 font-semibold">
                <div class="w-4 h-4 rounded bg-warning-200"></div>
                <h2 class="text-lg">Levy & Total</h2>
              </div>
            </template>

            <div class="space-y-3">
              <!-- PTC Levy -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-700">PTC Levy</label>
                  <UBadge color="neutral" variant="subtle" size="xs">10% of TMN</UBadge>
                </div>
                <div class="text-sm font-medium text-gray-900">{{ tmnBreakdown ? fmt(tmnBreakdown.ptcLevy) : '$0' }}</div>
              </div>

              <div class="border-t-2 border-gray-100"></div>

              <!-- Total TMN (final calculated value) -->
              <div class="flex items-center justify-between bg-warning-50/50 -mx-6 px-6 py-5 border-y border-warning-100">
                <label class="text-xl font-bold text-warning-900 uppercase tracking-widest">Total TMN</label>
                <div class="text-4xl font-black text-warning-600">{{ tmnBreakdown ? fmt(tmnBreakdown.tmn) : '$0' }}</div>
              </div>
            </div>
          </UCard>

        </div>
      </div>

      <!-- SALARY SPECIFIC -->
      <div v-else-if="source.type === 'salary' && source.salary" class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 font-semibold text-success-700">
              <UIcon name="i-heroicons-briefcase" />
              Salary Settings
            </div>
          </template>
          
          <div class="space-y-6">
            <div class="space-y-1">
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Gross Annual Salary</label>
              <UInput v-model="source.salary.grossAnnual" type="number" size="xl" icon="i-heroicons-currency-dollar" />
              <p class="text-[10px] text-gray-400">Your total annual package before tax and super</p>
            </div>
          </div>
        </UCard>

        <UCard class="bg-success-50 border-none shadow-none">
          <div class="space-y-2 text-sm">
             <div class="flex justify-between">
                <span class="text-gray-600">Estimated Monthly Tax</span>
                <span class="font-medium text-error-600">-{{ fmt(estimatedSalaryMonthlyTax) }}</span>
             </div>
             <div class="flex justify-between pt-2 border-t border-success-200">
                <span class="font-bold text-success-900">Estimated Net Monthly</span>
                <span class="font-bold text-success-700">{{ fmt(estimatedSalaryNetMonthly) }}</span>
             </div>
          </div>
        </UCard>
      </div>

      <!-- CENTRELINK SPECIFIC -->
      <div v-else-if="source.type === 'centrelink' && source.centrelink" class="space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 font-semibold text-warning-700">
              <UIcon name="i-heroicons-building-library" />
              Centrelink Settings
            </div>
          </template>
          
          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div class="space-y-1">
                  <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Fortnightly Amount</label>
                  <UInput v-model="source.centrelink.fortnightlyAmount" type="number" icon="i-heroicons-currency-dollar" />
               </div>
               <div class="space-y-1">
                  <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Payment Type</label>
                  <USelect 
                    v-model="source.centrelink.paymentType"
                    :items="['Youth Allowance', 'JobSeeker', 'Parenting Payment', 'FTB Part A', 'FTB Part B', 'Other']"
                  />
               </div>
               <div class="space-y-1">
                   <label class="text-xs font-medium text-gray-600 uppercase tracking-wider">Last Known Payment Date</label>
                   <UInput v-model="source.centrelink.paymentAnchorDate" type="date" />
                   <p class="text-[10px] text-gray-400">A recent payment date to calculate fortnightly cycle</p>
                </div>
            </div>

            <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                   <label class="text-sm font-medium text-gray-700">Taxable Payment</label>
                   <p class="text-[10px] text-gray-400">If checked, this income counts towards HECS repayments and income tax.</p>
                </div>
                <USwitch v-model="source.centrelink.taxable" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Action Button -->
      <div class="pt-4">
        <UButton 
          label="Save & Return to Household" 
          icon="i-heroicons-check" 
          block 
          size="lg" 
          to="/household"
          color="primary"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSessionStore } from '~/composables/useSessionStore'
import { formatCurrency } from '~/composables/useFormatter'
import { calculateTmnBreakdown, calculateBankAmount } from '~/composables/useTmnCalculator'
import { calculateIncomeTax, calculateHecsRepayment, getIncomeYear } from '~/composables/useTaxCalculator'

const route = useRoute()
const router = useRouter()
const store = useSessionStore()

const sourceId = route.params.id as string
const source = computed(() => store.config.incomeSources.find(s => s.id === sourceId))
const person = computed(() => store.config.people.find(p => p.id === source.value?.personId))

onMounted(() => {
  if (!source.value) {
    router.push('/household')
  }
})

function handleDelete() {
  if (confirm(`Are you sure you want to delete "${source.value?.name}"?`)) {
    store.removeIncomeSource(sourceId)
    router.push('/household')
  }
}

// TMN CALCULATIONS
const tmnBreakdown = computed(() => {
  if (source.value?.type === 'tmn' && source.value.tmn) {
    return calculateTmnBreakdown(source.value.tmn)
  }
  return null
})

const bankAmount = computed(() => {
  if (source.value?.type === 'tmn' && source.value.tmn) {
    return calculateBankAmount(source.value.tmn, !!person.value?.hecsDebt)
  }
  return 0
})

const recommendedTax = computed(() => {
  if (tmnBreakdown.value) {
    const taxableAnnual = tmnBreakdown.value.taxableIncome * 12
    const annualTax = calculateIncomeTax(taxableAnnual)
    return Math.round(annualTax / 12)
  }
  return 0
})

// Tax Breakdown Logic
const showTaxDetails = ref(false)

const baseTax = computed(() => {
  if (!tmnBreakdown.value) return 0
  const annual = tmnBreakdown.value.taxableIncome * 12
  const total = calculateIncomeTax(annual)
  const medicare = annual > 26000 ? annual * 0.02 : 0
  return total - medicare
})

const medicareLevy = computed(() => {
  if (!tmnBreakdown.value) return 0
  const annual = tmnBreakdown.value.taxableIncome * 12
  return annual > 26000 ? annual * 0.02 : 0
})

// SALARY CALCULATIONS
const estimatedSalaryMonthlyTax = computed(() => {
  if (source.value?.type === 'salary' && source.value.salary) {
    return calculateIncomeTax(source.value.salary.grossAnnual) / 12
  }
  return 0
})

const estimatedSalaryNetMonthly = computed(() => {
  if (source.value?.type === 'salary' && source.value.salary) {
    const gross = source.value.salary.grossAnnual
    const tax = calculateIncomeTax(gross)
    return (gross - tax) / 12
  }
  return 0
})

// Format helper
function fmt(value: number): string {
  return formatCurrency(value, { abbrev: false })
}
</script>

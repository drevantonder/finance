<template>
  <div class="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm transition-all hover:border-primary-100">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div :class="[getTypeColor(source.type), 'p-2 rounded-xl']">
          <UIcon :name="getTypeIcon(source.type)" class="text-xl shrink-0" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-900 truncate">{{ source.name }}</span>
            <UBadge v-if="person" :label="person.name" color="neutral" variant="subtle" size="xs" icon="i-heroicons-user" />
            <UBadge v-if="!isActive" label="Scheduled" color="neutral" variant="subtle" size="xs" />
          </div>
          <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none mt-1">
            {{ getTypeLabel(source.type) }}
          </p>
        </div>
      </div>
      
      <UButton 
        :to="`/income/${source.id}`" 
        variant="ghost" 
        color="neutral" 
        size="sm" 
        icon="i-heroicons-cog-6-tooth" 
      />
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <!-- Input Section -->
      <div class="space-y-3">
        <div class="flex justify-between items-center text-[10px] text-gray-400 uppercase font-bold tracking-wider">
          <span>{{ getPrimaryInputLabel(source.type) }}</span>
          <span v-if="source.type === 'tmn' && source.tmn" class="text-gray-900 font-black text-xs">
            {{ formatCurrency(source.tmn.targetAmount) }}
          </span>
        </div>

        <template v-if="source.type === 'tmn' && source.tmn">
          <TmnSlider v-model="source.tmn.targetAmount" compact />
        </template>
        
        <template v-else-if="source.type === 'salary' && source.salary">
          <UInput 
            v-model="source.salary.grossAnnual" 
            type="number" 
            size="lg" 
            icon="i-heroicons-currency-dollar"
            :ui="{ base: 'font-bold' }"
          >
            <template #trailing>
              <span class="text-gray-400 text-xs font-medium mr-2">/yr</span>
            </template>
          </UInput>
        </template>
        
        <template v-else-if="source.type === 'centrelink' && source.centrelink">
          <UInput 
            v-model="source.centrelink.fortnightlyAmount" 
            type="number" 
            size="lg" 
            icon="i-heroicons-currency-dollar"
            :ui="{ base: 'font-bold' }"
          >
            <template #trailing>
              <span class="text-gray-400 text-xs font-medium mr-2">/fn</span>
            </template>
          </UInput>
        </template>
      </div>

      <!-- Result Section -->
      <div class="flex flex-col md:items-end justify-center py-4 md:py-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-8">
        <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Monthly Net</span>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-black text-primary-600 tabular-nums tracking-tight">
            {{ formatCurrency(monthlyNet) }}
          </span>
          <span class="text-xs text-gray-400 font-bold uppercase">/mo</span>
        </div>
        <p class="text-[10px] text-gray-400 mt-1 font-medium italic">Post-tax & deductions</p>
      </div>
    </div>

    <!-- Secondary Stats Footer -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-50">
      <template v-if="source.type === 'tmn' && source.tmn">
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">FP Amount</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(tmnDetails.fp) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Stipend</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(tmnDetails.bank) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">MFBs</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(tmnDetails.mfb) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tax</div>
          <div class="text-xs font-bold text-gray-500">{{ formatCurrency(tmnDetails.tax) }}</div>
        </div>
      </template>

      <template v-else-if="source.type === 'salary' && source.salary">
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Annual Salary</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(source.salary.grossAnnual) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Monthly Tax</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(salaryDetails.tax / 12) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Annual Net</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(salaryDetails.netMonthly * 12) }}</div>
        </div>
      </template>

      <template v-else-if="source.type === 'centrelink' && source.centrelink">
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Fortnightly</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(source.centrelink.fortnightlyAmount) }}</div>
        </div>
        <div>
          <div class="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Yearly</div>
          <div class="text-xs font-bold text-gray-700">{{ formatCurrency(source.centrelink.fortnightlyAmount * 26) }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatter'
import { calculateSourceNetMonthly } from '~/composables/useLoanCalculator'
import { isIncomeActiveOnDate } from '~/composables/useDateUtils'
import { calculateTmnBreakdown, calculateBankAmount } from '~/composables/useTmnCalculator'
import { calculateIncomeTax, calculateHecsRepayment, getIncomeYear } from '~/composables/useTaxCalculator'
import type { IncomeSource, IncomeType, TmnIncomeConfig, SalaryIncomeConfig } from '~/types'

const props = defineProps<{
  source: IncomeSource
}>()

const store = useSessionStore()
const person = computed(() => store.config.people.find(p => p.id === props.source.personId))
const targetDate = computed(() => new Date(store.config.deposit.targetDate))
const incomeYear = computed(() => getIncomeYear(targetDate.value))

const isActive = computed(() => isIncomeActiveOnDate(props.source, new Date()))

const monthlyNet = computed(() => {
  return calculateSourceNetMonthly(props.source, undefined, targetDate.value, store.config.people)
})

const tmnDetails = computed(() => {
  if (props.source.type === 'tmn' && props.source.tmn) {
    const tmn = props.source.tmn
    const breakdown = calculateTmnBreakdown(tmn)
    const bank = calculateBankAmount(tmn, !!person.value?.hecsDebt)
    const tax = calculateIncomeTax(breakdown.taxableIncome * 12) / 12
    return { fp: breakdown.fp, tax, mfb: breakdown.mfb, bank }
  }
  return { fp: 0, tax: 0, mfb: 0, bank: 0 }
})

const salaryDetails = computed(() => {
  if (props.source.type === 'salary' && props.source.salary) {
    const salary = props.source.salary
    const tax = calculateIncomeTax(salary.grossAnnual)
    const netMonthly = (salary.grossAnnual - tax) / 12
    return { tax, netMonthly }
  }
  return { tax: 0, netMonthly: 0 }
})

function getTypeIcon(type: IncomeType) {
  switch (type) {
    case 'tmn': return 'i-heroicons-academic-cap'
    case 'salary': return 'i-heroicons-briefcase'
    case 'centrelink': return 'i-heroicons-building-library'
    default: return 'i-heroicons-question-mark-circle'
  }
}

function getTypeColor(type: IncomeType) {
  switch (type) {
    case 'tmn': return 'text-primary-600 bg-primary-50'
    case 'salary': return 'text-emerald-600 bg-emerald-50'
    case 'centrelink': return 'text-amber-600 bg-amber-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

function getTypeLabel(type: IncomeType) {
  switch (type) {
    case 'tmn': return 'Missionary Support'
    case 'salary': return 'Employment'
    case 'centrelink': return 'Government'
    default: return 'Other Income'
  }
}

function getPrimaryInputLabel(type: IncomeType) {
  switch (type) {
    case 'tmn': return 'Adjust Target'
    case 'salary': return 'Gross Annual'
    case 'centrelink': return 'Fortnightly'
    default: return 'Amount'
  }
}
</script>

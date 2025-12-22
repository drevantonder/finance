<template>
  <div class="space-y-6">
    <!-- 1. HERO: Projection Summary -->
    <div class="rounded-2xl bg-linear-to-br from-emerald-50 to-blue-50 p-6 shadow-lg">
       <div class="flex items-center justify-between mb-4">
         <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
           <UIcon name="i-heroicons-chart-bar-square" class="text-emerald-600" />
           Projected Deposit
         </h2>
          <div class="text-right">
            <div class="text-3xl font-extrabold text-emerald-700">{{ formatCurrency(smartResult.finalDeposit) }}</div>
            <div class="text-xs text-gray-500">by {{ targetDateLabel }}</div>
            <div v-if="hasPartialMonthExcluded" class="text-[10px] text-gray-400 mt-1">
              Deposit calculated to {{ exactTargetDateLabel }}
            </div>
          </div>
        </div>

       
         <!-- Breakdown Pills -->
         <div class="flex flex-wrap gap-3">
            <div class="flex-1 min-w-[100px] p-3 bg-white/70 rounded-lg text-center border-2 border-dashed border-gray-200">
              <div class="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">Emergency Fund</div>
              <div class="text-lg font-bold text-gray-500">{{ formatCurrency(finalEmergency) }}</div>
            </div>
            <div class="flex-1 min-w-[100px] p-3 bg-white/70 rounded-lg text-center">
              <div class="text-[10px] uppercase font-semibold text-gray-500 tracking-wide">Stocks</div>
              <div class="text-lg font-bold text-purple-700">{{ formatCurrency(finalStocks) }}</div>
            </div>
            <div class="flex-1 min-w-[100px] p-3 bg-white/70 rounded-lg text-center">
              <div class="text-[10px] uppercase font-semibold text-gray-500 tracking-wide">FHSS</div>
              <div class="text-lg font-bold text-teal-700">{{ formatCurrency(breakdownFhss) }}</div>
            </div>
            <div class="flex-1 min-w-[100px] p-3 bg-emerald-100/70 rounded-lg text-center border border-emerald-200">
              <div class="text-[10px] uppercase font-semibold text-emerald-600 tracking-wide">Total Saved</div>
              <div class="text-lg font-bold text-emerald-700">+{{ formatCurrency(smartResult.totalSaved) }}</div>
            </div>
         </div>
     </div>


    <!-- 2. Cash Flow Settings Link -->
    <div class="rounded-xl bg-white p-6 shadow">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-calculator" class="text-primary-600" />
        Cash Flow & Budget
      </h3>
      
      <div class="p-4 bg-primary-50 rounded-lg border border-primary-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 rounded-lg text-primary-600">
            <UIcon name="i-heroicons-banknotes" class="h-5 w-5" />
          </div>
          <div>
            <div class="text-sm font-bold text-primary-900">Manage Budget & Expenses</div>
            <div class="text-xs text-primary-600">
              Set recurring costs, savings goals, and emergency fund targets
            </div>
          </div>
        </div>
        <UButton 
          to="/budget" 
          label="Edit Budget" 
          icon="i-heroicons-arrow-right"
          trailing
          color="primary"
          variant="soft"
          size="sm"
        />
      </div>
    </div>

    <!-- 3. Current Assets -->
    <div class="rounded-xl bg-white p-6 shadow">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-wallet" class="text-blue-600" />
        Current Assets
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Cash in Bank (Now)</label>
          <div class="flex gap-2">
            <UInput v-model="localConfig.cashSavings" type="number" icon="i-heroicons-currency-dollar" size="lg" class="flex-1" />
            <UInput v-model="localConfig.cashSavingsAsOfDate" type="date" size="lg" class="w-40" />
          </div>
          <p v-if="cashSavingsIsStale" class="text-[10px] text-amber-600 flex items-center gap-1">
            <UIcon name="i-heroicons-exclamation-triangle" />
            Last updated {{ cashSavingsDaysAgo }} days ago
          </p>
          <p v-else class="text-[10px] text-gray-400">Current balance & date checked</p>
        </div>
        
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Target Purchase Date</label>
          <UInput v-model="localConfig.targetDate" type="date" size="lg" />
          <p class="text-[10px] text-gray-400">When you plan to buy</p>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Journey Start Date</label>
          <UInput v-model="localConfig.journeyStartDate" type="date" size="lg" />
          <p class="text-[10px] text-gray-400">When to start projection (defaults to today)</p>
        </div>
      </div>
    </div>

    <!-- 4. Stock Holdings -->
    <div class="rounded-xl bg-white p-6 shadow">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" class="text-purple-600" />
          Stock/ETF Holdings
        </h3>
        <div class="text-right">
          <div class="text-sm font-bold text-purple-700">{{ formatCurrency(currentStockValue) }}</div>
          <div class="text-[10px] text-gray-400">Current Value</div>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-lg">
        <div class="text-xs text-gray-500">
          <span v-if="stockPrices.lastFetched.value">
            Prices updated {{ lastUpdatedText }}
          </span>
          <span v-else>Prices not yet loaded</span>
        </div>
        <UButton 
          label="Refresh" 
          icon="i-heroicons-arrow-path" 
          size="xs" 
          variant="soft"
          :loading="stockPrices.loading.value"
          @click="handleRefreshPrices"
        />
      </div>
      
      <div class="space-y-2">
        <div 
          v-for="(holding, index) in localConfig.holdings" 
          :key="index"
          class="flex items-center gap-3 border rounded-lg p-3 transition-colors"
          :class="isStockFailed(holding.symbol) ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-primary-300'"
        >
          <div class="w-32">
            <StockSearchInput
              :model-value="holding.symbol"
              @update:model-value="val => updateHoldingSymbol(index, val)"
              :is-failed="isStockFailed(holding.symbol)"
              @blur="onSymbolBlur(holding.symbol)"
            />
          </div>
          <div class="w-20">
            <UInput 
              v-model="holding.shares" 
              type="number"
              placeholder="Qty"
              size="sm"
              @update:model-value="val => updateHoldingShares(index, val)"
            />
          </div>
          <div class="w-32">
            <UInput 
              v-model="holding.sharesAsOfDate" 
              type="date"
              size="sm"
            />
          </div>
          
          <div v-if="isStockValid(holding.symbol)" class="flex items-center gap-2 flex-1 text-xs text-gray-500">
            <span>@ ${{ (stockPrices.getPrice(holding.symbol) || 0).toFixed(2) }}</span>
            <UBadge :label="`${(getGrowthRate(holding.symbol) * 100).toFixed(0)}% avg`" color="success" variant="subtle" size="xs" />
          </div>
          <div v-else class="flex-1" />
          
          <div v-if="isStockValid(holding.symbol)" class="text-sm font-medium text-gray-900">
            {{ formatCurrency((stockPrices.getPrice(holding.symbol) || 0) * holding.shares) }}
          </div>
          
          <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="removeHolding(index)" />
        </div>
        
        <div v-if="localConfig.holdings.length === 0" class="text-center py-6 text-gray-400">
          <p class="text-sm">No stock holdings</p>
        </div>
      </div>
      
      <UButton label="Add Stock" icon="i-heroicons-plus" variant="soft" size="xs" class="mt-3" @click="addNewHolding" />
    </div>

    <!-- 4b. Investment Strategy -->
    <div class="rounded-xl bg-white p-6 shadow">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UIcon name="i-heroicons-presentation-chart-line" class="text-indigo-600" />
          Investment Strategy
        </h3>
        <UBadge 
          v-if="Math.abs(totalAllocationWeight - 1) > 0.001" 
          :color="totalAllocationWeight > 1 ? 'error' : 'warning'" 
          variant="subtle"
          size="sm"
        >
          Total: {{ (totalAllocationWeight * 100).toFixed(0) }}% (Target: 100%)
        </UBadge>
        <UBadge v-else color="success" variant="subtle" size="sm">Target: 100%</UBadge>
      </div>

      <div class="space-y-4">
        <!-- Allocations Table -->
        <div class="overflow-hidden border border-gray-200 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Weight</th>
                <th scope="col" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Yield</th>
                <th scope="col" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
                <th scope="col" class="w-10"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(allocation, index) in strategy.allocations" :key="index">
                <td class="px-3 py-2">
                  <StockSearchInput
                    :model-value="allocation.symbol"
                    @update:model-value="val => updateAllocationSymbol(index, val)"
                    :is-failed="isStockFailed(allocation.symbol)"
                    @blur="onSymbolBlur(allocation.symbol)"
                  />
                </td>
                <td class="px-3 py-2">
                  <UInput 
                    :model-value="allocation.weight * 100" 
                    type="number" 
                    size="sm"
                    @update:model-value="val => updateAllocationWeight(index, Number(val))"
                  >
                    <template #trailing>
                      <span class="text-gray-500 text-xs">%</span>
                    </template>
                  </UInput>
                </td>
                <td class="px-3 py-2 text-right text-sm text-gray-600">
                  {{ isStockValid(allocation.symbol) ? formatCurrency(stockPrices.getPrice(allocation.symbol) || 0) : '-' }}
                </td>
                <td class="px-3 py-2 text-right text-sm text-gray-600">
                  {{ isStockValid(allocation.symbol) ? (stockPrices.getDividendYield(allocation.symbol) * 100).toFixed(2) + '%' : '-' }}
                </td>
                <td class="px-3 py-2 text-right text-sm font-medium text-emerald-600">
                  {{ isStockValid(allocation.symbol) ? (stockPrices.getTotalReturnRate(allocation.symbol) * 100).toFixed(1) + '%' : '-' }}
                </td>
                <td class="px-3 py-2 text-center">
                  <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="removeAllocation(index)" />
                </td>
              </tr>
              <tr v-if="strategy.allocations.length === 0">
                <td colspan="6" class="px-3 py-4 text-center text-sm text-gray-400">
                  No allocations configured
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <UButton label="Add Allocation" icon="i-heroicons-plus" variant="soft" size="xs" @click="addAllocation" />

        <!-- Settings Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-600">Broker Fee</label>
            <UInput 
              :model-value="strategy.brokerFee" 
              @update:model-value="val => updateStrategyField('brokerFee', Number(val))"
              type="number" 
              icon="i-heroicons-currency-dollar" 
              size="sm" 
            />
            <p class="text-[10px] text-gray-400">Per transaction</p>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-600">Min Investment</label>
            <UInput 
              :model-value="strategy.minimumInvestment" 
              @update:model-value="val => updateStrategyField('minimumInvestment', Number(val))"
              type="number" 
              icon="i-heroicons-currency-dollar" 
              size="sm" 
            />
            <p class="text-[10px] text-gray-400">Minimum surplus to invest</p>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-600">Review Cadence</label>
            <USelect 
              :model-value="strategy.reviewCadence" 
              @update:model-value="val => updateStrategyField('reviewCadence', val)"
              :items="['weekly', 'fortnightly', 'monthly']"
              size="sm" 
            />
            <p class="text-[10px] text-gray-400">How often you check</p>
          </div>
        </div>

        <div class="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 flex gap-2 items-start border border-gray-100">
          <UIcon name="i-heroicons-information-circle" class="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
          <p>
            Surplus cash above your emergency target will be invested according to this allocation. 
            Broker fees are deducted per stock, per transaction.
          </p>
        </div>
      </div>
    </div>
    
    <!-- 5. FHSS Planner -->
    <div class="rounded-xl bg-white p-6 shadow">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UIcon name="i-heroicons-building-library" class="text-teal-600" />
          FHSS Contributions
        </h3>
        <div class="text-right">
          <div class="text-sm font-bold text-teal-700">{{ formatCurrency(breakdownFhss) }}</div>
          <div class="text-[10px] text-gray-400">Projected Releasable</div>
        </div>
      </div>
       
       <div class="space-y-2">
        <div 
          v-for="(contribution, index) in localConfig.fhssContributions" 
          :key="contribution.id || index"
          class="flex items-center gap-3 border border-gray-100 rounded-lg p-3"
        >
          <UInput v-model="contribution.date" type="date" size="sm" class="w-36" />
          <UInput v-model="contribution.amount" type="number" icon="i-heroicons-currency-dollar" size="sm" class="flex-1" />
          <USelect 
            v-model="contribution.type"
            :items="[{ label: 'Concessional (85%)', value: 'concessional' }, { label: 'Non-concessional', value: 'non-concessional' }]"
            size="sm"
            class="w-44"
          />
          <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="removeFhssContribution(index)" />
        </div>
        <div v-if="localConfig.fhssContributions.length === 0" class="text-center py-6 text-gray-400">
          <p class="text-sm">No FHSS contributions</p>
        </div>
       </div>
       
       <UButton label="Add Contribution" icon="i-heroicons-plus" variant="soft" size="xs" class="mt-3" @click="addNewFhssContribution" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { formatCurrency, formatDateLabel } from '~/composables/useFormatter'
import { useStockPrices } from '~/composables/useStockPrices'
import { calculateFhssResult } from '~/composables/useStockCalculator'
import { useProjectionResults } from '~/composables/useProjectionResults'
import type { DepositConfig, IncomeSource, InvestmentStrategy, StockHolding } from '~/types'

const store = useSessionStore()
const { 
  smartResult, 
  chartSeries, 
  hasPartialMonthExcluded, 
  targetDateLabel, 
  exactTargetDateLabel 
} = useProjectionResults()

const props = defineProps<{
  modelValue: DepositConfig,
  incomeSources: IncomeSource[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DepositConfig]
}>()

const localConfig = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const stockPrices = useStockPrices()

onMounted(async () => {
  const symbols = localConfig.value.holdings.map(h => h.symbol).filter(s => s)
  if (symbols.length > 0) {
    await stockPrices.initializePrices(symbols)
  }
})

// === BREAKDOWN FROM FINAL SERIES POINT ===
const finalPoint = computed(() => chartSeries.value[chartSeries.value.length - 1])
const finalStocks = computed(() => finalPoint.value?.stocksValue || 0)
const finalEmergency = computed(() => finalPoint.value?.emergencyFund || 0)

const currentStockValue = computed(() => {
  return localConfig.value.holdings.reduce((sum, h) => {
    const price = stockPrices.getPrice(h.symbol) || 0
    return sum + (h.shares * price)
  }, 0)
})

const breakdownFhss = computed(() => {
  return calculateFhssResult(
    localConfig.value.fhssContributions,
    localConfig.value.targetDate,
    localConfig.value.fhssSicRate
  ).totalReleasable
})

const cashSavingsIsStale = computed(() => {
  if (!localConfig.value.cashSavingsAsOfDate) return false
  const asOf = new Date(localConfig.value.cashSavingsAsOfDate)
  const daysSince = (Date.now() - asOf.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince > 30
})

const cashSavingsDaysAgo = computed(() => {
  if (!localConfig.value.cashSavingsAsOfDate) return 0
  const asOf = new Date(localConfig.value.cashSavingsAsOfDate)
  return Math.floor((Date.now() - asOf.getTime()) / (1000 * 60 * 60 * 24))
})

const lastUpdatedText = computed(() => {
  const lastFetched = stockPrices.lastFetched.value
  if (!lastFetched) return ''
  
  const diffMs = Date.now() - lastFetched.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
})

async function handleRefreshPrices() {
  const symbols = localConfig.value.holdings.map(h => h.symbol).filter(s => s)
  if (symbols.length > 0) {
    await stockPrices.refreshPrices(symbols, true)
  }
}

// === STOCK LOGIC ===
function isStockValid(symbol: string): boolean {
  if (!symbol) return false
  return stockPrices.getPrice(symbol) !== null
}

function isStockFailed(symbol: string): boolean {
  if (!symbol) return false
  return stockPrices.hasFailed(symbol)
}

function getGrowthRate(symbol: string) {
  const data = stockPrices.getStockData(symbol)
  return data?.recommendedRate || localConfig.value.defaultGrowthRate / 100 || 0.07
}

async function onSymbolBlur(symbol: string) {
  if (symbol && symbol.length >= 2) {
    await stockPrices.fetchNewSymbol(symbol.toUpperCase())
  }
}

function updateHoldingShares(index: number, shares: number) {
  const newHoldings = [...localConfig.value.holdings]
  if (newHoldings[index]) {
    newHoldings[index] = { ...newHoldings[index], shares }
    localConfig.value = { ...localConfig.value, holdings: newHoldings }
  }
}

function updateHoldingSymbol(index: number, symbol: string) {
  const newHoldings = [...localConfig.value.holdings]
  if (newHoldings[index]) {
    newHoldings[index] = { ...newHoldings[index], symbol }
    localConfig.value = { ...localConfig.value, holdings: newHoldings }
  }
}

function addNewHolding() {
  const newHolding: StockHolding = { 
    symbol: '', 
    shares: 0, 
    sharesAsOfDate: new Date().toISOString().split('T')[0] 
  }
  localConfig.value = { ...localConfig.value, holdings: [...localConfig.value.holdings, newHolding] }
}

function removeHolding(index: number) {
  const newHoldings = [...localConfig.value.holdings]
  newHoldings.splice(index, 1)
  localConfig.value = { ...localConfig.value, holdings: newHoldings }
}

// === INVESTMENT STRATEGY LOGIC ===
const strategy = computed({
  get: () => {
    return localConfig.value.investmentStrategy || {
      allocations: [{ symbol: 'IVV.AX', weight: 1.0 }],
      brokerFee: 2,
      minimumInvestment: 500,
      reviewCadence: 'fortnightly'
    }
  },
  set: (val) => {
    localConfig.value = { ...localConfig.value, investmentStrategy: val }
  }
})

const totalAllocationWeight = computed(() => {
  return strategy.value.allocations.reduce((sum, a) => sum + (a.weight || 0), 0)
})

function updateStrategyField(field: keyof InvestmentStrategy, value: any) {
  strategy.value = { ...strategy.value, [field]: value }
}

function addAllocation() {
  const newAlloc = { symbol: '', weight: 0 }
  strategy.value = { 
    ...strategy.value, 
    allocations: [...strategy.value.allocations, newAlloc] 
  }
}

function removeAllocation(index: number) {
  const newAllocs = [...strategy.value.allocations]
  newAllocs.splice(index, 1)
  strategy.value = { ...strategy.value, allocations: newAllocs }
}

function updateAllocationSymbol(index: number, symbol: string) {
  const newAllocs = [...strategy.value.allocations]
  if (newAllocs[index]) {
    newAllocs[index] = { ...newAllocs[index], symbol }
    strategy.value = { ...strategy.value, allocations: newAllocs }
  }
}

function updateAllocationWeight(index: number, weightPercent: number) {
  const newAllocs = [...strategy.value.allocations]
  if (newAllocs[index]) {
    newAllocs[index] = { ...newAllocs[index], weight: weightPercent / 100 }
    strategy.value = { ...strategy.value, allocations: newAllocs }
  }
}

onMounted(async () => {
  // Initialize strategy if missing
  if (!localConfig.value.investmentStrategy) {
    localConfig.value = {
      ...localConfig.value,
      investmentStrategy: {
         allocations: [{ symbol: 'IVV.AX', weight: 1.0 }],
         brokerFee: 2,
         minimumInvestment: 500,
         reviewCadence: 'fortnightly'
      }
    }
  }
  
  // Fetch prices for allocation symbols
  const allocSymbols = (localConfig.value.investmentStrategy?.allocations || [])
    .map(a => a.symbol)
    .filter(s => s)
  
  if (allocSymbols.length > 0) {
    await stockPrices.initializePrices(allocSymbols)
  }
})

// === FHSS LOGIC ===
function addNewFhssContribution() {
  const newContribution: import('~/types').FhssContribution = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0] || '',
    amount: 5000,
    type: 'concessional' as const
  }
  if (!localConfig.value.fhssContributions) localConfig.value.fhssContributions = []
  localConfig.value.fhssContributions.push(newContribution)
}

function removeFhssContribution(index: number) {
  localConfig.value.fhssContributions.splice(index, 1)
}
</script>

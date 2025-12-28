<script setup lang="ts">
import { useSessionStore } from '~/composables/useSessionStore'
import { formatCurrency } from '~/composables/useFormatter'
import { useBudget } from '~/composables/useBudget'
import type { BudgetItem, BudgetFrequency, BudgetCategory, GoalType } from '~/types'

const store = useSessionStore()
const { 
  toFortnightlyAmount, 
  toMonthlyAmount, 
  getBudgetSummary, 
  isGoalComplete,
  checkAndRenewRecurringGoals,
  isItemActiveOnDate
} = useBudget()

const budgetConfig = computed({
  get: () => store.config.budget,
  set: (val) => { store.config.budget = val }
})

const budgetItems = computed({
  get: () => budgetConfig.value.budgetItems || [],
  set: (val) => { budgetConfig.value = { ...budgetConfig.value, budgetItems: val } }
})

onMounted(() => {
  const renewed = checkAndRenewRecurringGoals(budgetItems.value)
  if (renewed !== budgetItems.value) {
    budgetItems.value = renewed
  }
})

const summary = computed(() => getBudgetSummary(budgetItems.value))
const activeItems = computed(() => budgetItems.value.filter(i => !i.completedAt))
const completedItems = computed(() => budgetItems.value.filter(i => !!i.completedAt))
const essentialItems = computed(() => activeItems.value.filter(i => i.category === 'essential'))
const recurringItems = computed(() => activeItems.value.filter(i => i.category === 'recurring'))
const goalItems = computed(() => activeItems.value.filter(i => i.category === 'goal'))

const frequencies: { label: string, value: BudgetFrequency }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Fortnightly', value: 'fortnightly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: '6 Months', value: 'biannually' },
  { label: 'Yearly', value: 'yearly' }
]

const goalTypes: { label: string, value: GoalType }[] = [
  { label: 'Once-off', value: 'once-off' },
  { label: 'Recurring (Annual)', value: 'recurring' }
]

function addItem(category: BudgetCategory) {
  const newItem: BudgetItem = {
    id: crypto.randomUUID(),
    name: category === 'goal' ? 'New Goal' : 'New Expense',
    amount: 100,
    frequency: category === 'goal' ? 'yearly' : 'fortnightly',
    category,
    goalType: category === 'goal' ? 'once-off' : undefined,
    deadline: category === 'goal' ? new Date(new Date().getFullYear(), 11, 25).toISOString().split('T')[0] : undefined
  }
  budgetItems.value = [...budgetItems.value, newItem]
}

function removeItem(id: string) {
  budgetItems.value = budgetItems.value.filter(i => i.id !== id)
}

function markComplete(id: string) {
  const item = budgetItems.value.find(i => i.id === id)
  if (item && item.category === 'goal') {
    const deadline = item.deadline ? new Date(item.deadline) : new Date()
    const today = new Date()
    item.completedAt = deadline < today ? item.deadline : today.toISOString().split('T')[0]
  } else if (item) {
    item.completedAt = new Date().toISOString().split('T')[0]
  }
}

function restoreItem(id: string) {
  const item = budgetItems.value.find(i => i.id === id)
  if (item) item.completedAt = undefined
}

function getFortnightsRemaining(deadlineStr: string) {
  if (!deadlineStr) return 0
  const deadline = new Date(deadlineStr)
  if (isNaN(deadline.getTime())) return 0
  const diff = deadline.getTime() - new Date().getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.ceil(days / 14))
}

function getItemStatusLabel(item: BudgetItem): string {
  const now = new Date()
  if (item.startDate && new Date(item.startDate) > now) return 'Upcoming'
  if (item.endDate && new Date(item.endDate) < now) return 'Ended'
  return 'Active'
}

function getItemStatusColor(item: BudgetItem): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  const now = new Date()
  if (item.startDate && new Date(item.startDate) > now) return 'info'
  if (item.endDate && new Date(item.endDate) < now) return 'neutral'
  return 'success'
}

function addOneOffExpense() {
  if (!budgetConfig.value.oneOffExpenses) budgetConfig.value.oneOffExpenses = []
  budgetConfig.value.oneOffExpenses.push({
    id: crypto.randomUUID(),
    name: 'New Expense',
    amount: 500,
    date: new Date().toISOString().split('T')[0] as string
  })
}

function removeOneOffExpense(index: number) {
  budgetConfig.value.oneOffExpenses.splice(index, 1)
}

function addOneOffDeposit() {
  if (!budgetConfig.value.oneOffDeposits) budgetConfig.value.oneOffDeposits = []
  budgetConfig.value.oneOffDeposits.push({
    id: crypto.randomUUID(),
    name: 'New Deposit',
    amount: 1000,
    date: new Date().toISOString().split('T')[0] as string
  })
}

function removeOneOffDeposit(index: number) {
  budgetConfig.value.oneOffDeposits.splice(index, 1)
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-20">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Budget Planner</h1>
      <p class="text-gray-500">Plan your spending, savings goals, and emergency fund.</p>
    </div>

    <!-- Summary Cards (Restored) -->
    <UCard class="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-950 dark:to-blue-950 border-primary-100 dark:border-primary-900 shadow-md">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Essential</div>
          <div class="text-2xl font-black text-gray-900 dark:text-white">{{ formatCurrency(summary.essential) }}</div>
          <div class="text-[10px] text-gray-400">per fortnight</div>
        </div>
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Recurring</div>
          <div class="text-2xl font-black text-gray-900 dark:text-white">{{ formatCurrency(summary.recurring) }}</div>
          <div class="text-[10px] text-gray-400">per fortnight</div>
        </div>
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Goal Savings</div>
          <div class="text-2xl font-black text-gray-900 dark:text-white">{{ formatCurrency(summary.goals) }}</div>
          <div class="text-[10px] text-gray-400">per fortnight</div>
        </div>
        <div class="space-y-1 bg-primary-100/50 dark:bg-primary-900/50 p-3 rounded-xl border border-primary-200 dark:border-primary-800">
          <div class="text-[10px] uppercase font-bold text-primary-700 dark:text-primary-300 tracking-wider">Total Monthly</div>
          <div class="text-2xl font-black text-primary-800 dark:text-primary-200">{{ formatCurrency(summary.totalMonthly) }}</div>
          <div class="text-[10px] text-primary-600 dark:text-primary-400">including goal savings</div>
        </div>
      </div>
    </UCard>

    <!-- Emergency Savings (Restored from old_budget.vue lines 183-238) -->
    <section class="space-y-3">
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 px-1">
        <UIcon name="i-heroicons-shield-check" class="text-red-500" />
        Emergency Savings
      </h2>
      
      <UCard>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase tracking-wide text-gray-500">Emergency Floor</label>
            <UInput 
              v-model="budgetConfig.emergencyFloor" 
              type="number" 
              icon="i-heroicons-currency-dollar"
              :min="0"
              :step="100"
            />
            <p class="text-[10px] text-gray-400">Never dip below this floor.</p>
          </div>
          
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase tracking-wide text-gray-500">Emergency Target</label>
            <UInput 
              v-model="budgetConfig.emergencyTarget" 
              type="number" 
              icon="i-heroicons-currency-dollar"
              :min="budgetConfig.emergencyFloor"
              :step="100"
            />
            <p class="text-[10px] text-gray-400">Invest only when above this.</p>
          </div>
          
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Status</div>
              <div class="text-sm font-black" :class="{
                'text-red-600': store.config.deposit.cashSavings < budgetConfig.emergencyFloor,
                'text-yellow-600': store.config.deposit.cashSavings < budgetConfig.emergencyTarget,
                'text-green-600': store.config.deposit.cashSavings >= budgetConfig.emergencyTarget
              }">
                {{ store.config.deposit.cashSavings < budgetConfig.emergencyFloor ? '⚠️ BELOW FLOOR' :
                   store.config.deposit.cashSavings < budgetConfig.emergencyTarget ? '⏳ REBUILDING' :
                   '✓ HEALTHY' }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-[10px] font-bold uppercase tracking-wide text-gray-400">Current Cash</div>
              <div class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(store.config.deposit.cashSavings) }}</div>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Budget Items with Start/End Dates (Restored) -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <UIcon name="i-heroicons-home" class="text-primary-500" />
          Essential Expenses
        </h2>
        <UButton icon="i-heroicons-plus" size="xs" color="primary" variant="soft" label="Add Essential" @click="addItem('essential')" />
      </div>

      <div class="space-y-2">
        <div v-for="item in essentialItems" :key="item.id" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="item.name" variant="none" placeholder="Name" class="flex-1 font-medium" />
              <div class="flex items-center gap-2">
                <UInput v-model="item.amount" type="number" step="0.01" class="w-24 text-right" size="sm">
                  <template #leading>
                    <span class="text-gray-400 text-xs">$</span>
                  </template>
                </UInput>
                <USelect v-model="item.frequency" :items="frequencies" size="sm" class="w-32" />
              </div>
              <div class="w-28 text-right px-2 border-l border-gray-50 dark:border-gray-800">
                <div class="text-sm font-bold">{{ formatCurrency(toFortnightlyAmount(item)) }}</div>
                <div class="text-[10px] text-gray-400">per fn</div>
              </div>
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeItem(item.id)" />
            </div>
            
            <!-- Start/End Date UI (Restored from old_budget.vue lines 271-287) -->
            <div class="flex items-center gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Start</span>
                <UInput :model-value="item.startDate || ''" @update:model-value="val => item.startDate = val" type="date" size="xs" class="w-32" />
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase">End</span>
                <UInput :model-value="item.endDate || ''" @update:model-value="val => item.endDate = val" type="date" size="xs" class="w-32" />
              </div>
              <UBadge 
                v-if="item.startDate || item.endDate"
                :label="getItemStatusLabel(item)"
                :color="getItemStatusColor(item)"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>
        </div>
        <div v-if="essentialItems.length === 0" class="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 text-sm">
          No essential expenses added yet.
        </div>
      </div>
    </section>

    <!-- Recurring (same pattern with start/end dates) -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-path" class="text-orange-500" />
          Recurring Expenses
        </h2>
        <UButton icon="i-heroicons-plus" size="xs" color="warning" variant="soft" label="Add Recurring" @click="addItem('recurring')" />
      </div>

      <div class="space-y-2">
        <div v-for="item in recurringItems" :key="item.id" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="item.name" variant="none" placeholder="Name" class="flex-1 font-medium" />
              <div class="flex items-center gap-2">
                <UInput v-model="item.amount" type="number" step="0.01" class="w-24 text-right" size="sm">
                  <template #leading>
                    <span class="text-gray-400 text-xs">$</span>
                  </template>
                </UInput>
                <USelect v-model="item.frequency" :items="frequencies" size="sm" class="w-32" />
              </div>
              <div class="w-28 text-right px-2 border-l border-gray-50 dark:border-gray-800">
                <div class="text-sm font-bold">{{ formatCurrency(toFortnightlyAmount(item)) }}</div>
                <div class="text-[10px] text-gray-400">per fn</div>
              </div>
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeItem(item.id)" />
            </div>

            <div class="flex items-center gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Start</span>
                <UInput :model-value="item.startDate || ''" @update:model-value="val => item.startDate = val" type="date" size="xs" class="w-32" />
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase">End</span>
                <UInput :model-value="item.endDate || ''" @update:model-value="val => item.endDate = val" type="date" size="xs" class="w-32" />
              </div>
              <UBadge 
                v-if="item.startDate || item.endDate"
                :label="getItemStatusLabel(item)"
                :color="getItemStatusColor(item)"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>
        </div>
        <div v-if="recurringItems.length === 0" class="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 text-sm">
          No recurring expenses added yet.
        </div>
      </div>
    </section>

    <!-- Savings Goals Section -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <UIcon name="i-heroicons-star" class="text-yellow-500" />
          Savings Goals
        </h2>
        <UButton icon="i-heroicons-plus" size="xs" color="success" variant="soft" label="Add Goal" @click="addItem('goal')" />
      </div>

      <div class="space-y-2">
        <div v-for="item in goalItems" :key="item.id" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="item.name" variant="none" placeholder="Goal Name" class="flex-1 font-medium" />
              <div class="flex items-center gap-2">
                <UInput v-model="item.amount" type="number" step="0.01" class="w-24 text-right" size="sm">
                  <template #leading>
                    <span class="text-gray-400 text-xs">$</span>
                  </template>
                </UInput>
                <USelect v-model="item.goalType" :items="goalTypes" size="sm" class="w-40" />
              </div>
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeItem(item.id)" />
            </div>

            <div class="flex items-center gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Deadline</span>
                <UInput :model-value="item.deadline || ''" @update:model-value="val => item.deadline = val" type="date" size="xs" class="w-32" />
              </div>
              <div v-if="item.deadline && !item.completedAt" class="flex items-center gap-2 text-xs">
                <span class="text-gray-500">{{ getFortnightsRemaining(item.deadline) }} fortnights</span>
                <span class="text-gray-400">→</span>
                <span class="font-bold text-primary-600">{{ formatCurrency(item.amount / Math.max(1, getFortnightsRemaining(item.deadline))) }}/fn</span>
              </div>
              <UButton 
                v-if="!item.completedAt" 
                label="Mark Complete" 
                icon="i-heroicons-check" 
                color="success" 
                variant="soft" 
                size="xs" 
                @click="markComplete(item.id)" 
                class="ml-auto"
              />
            </div>
          </div>
        </div>
        <div v-if="goalItems.length === 0" class="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 text-sm">
          No savings goals added yet.
        </div>
      </div>
    </section>

    <!-- Completed Goals -->
    <section v-if="completedItems.length > 0" class="space-y-3">
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 px-1">
        <UIcon name="i-heroicons-check-circle" class="text-success-500" />
        Completed Goals
      </h2>
      <div class="space-y-2">
        <div v-for="item in completedItems" :key="item.id" class="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-3 opacity-60">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-check-circle" class="text-success-500" />
              <div>
                <div class="font-medium text-sm">{{ item.name }}</div>
                <div class="text-xs text-gray-500">Completed {{ item.completedAt }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm">{{ formatCurrency(item.amount) }}</span>
              <UButton icon="i-heroicons-arrow-uturn-left" color="neutral" variant="ghost" size="xs" @click="restoreItem(item.id)" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

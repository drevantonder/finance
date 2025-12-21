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

// Auto-renew on mount
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
  if (item) {
    // For goals, mark as completed on deadline date (or today if past)
    if (item.category === 'goal') {
      const deadline = item.deadline ? new Date(item.deadline) : new Date()
      const today = new Date()
      item.completedAt = deadline < today ? item.deadline : today.toISOString().split('T')[0]
    } else {
      item.completedAt = new Date().toISOString().split('T')[0]
    }
  }
}

function restoreItem(id: string) {
  const item = budgetItems.value.find(i => i.id === id)
  if (item) {
    item.completedAt = undefined
  }
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
    <!-- Header & Summary -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Budget Planner</h1>
        <p class="text-gray-500">Plan your spending, savings goals, and emergency fund.</p>
      </div>
    </div>

    <UCard class="bg-linear-to-br from-primary-50 to-blue-50 border-primary-100 shadow-md">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Essential</div>
          <div class="text-2xl font-black text-gray-900">{{ formatCurrency(summary.essential) }}</div>
          <div class="text-[10px] text-gray-400">per fortnight</div>
        </div>
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Recurring</div>
          <div class="text-2xl font-black text-gray-900">{{ formatCurrency(summary.recurring) }}</div>
          <div class="text-[10px] text-gray-400">per fortnight</div>
        </div>
        <div class="space-y-1">
          <div class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Goal Savings</div>
          <div class="text-2xl font-black text-gray-900">{{ formatCurrency(summary.goals) }}</div>
          <div class="text-[10px] text-gray-400">per fortnight</div>
        </div>
        <div class="space-y-1 bg-primary-100/50 p-3 rounded-xl border border-primary-200">
          <div class="text-[10px] uppercase font-bold text-primary-700 tracking-wider">Total Monthly</div>
          <div class="text-2xl font-black text-primary-800">{{ formatCurrency(summary.totalMonthly) }}</div>
          <div class="text-[10px] text-primary-600">including goal savings</div>
        </div>
      </div>
    </UCard>

    <!-- Emergency Savings Settings -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-shield-check" class="text-red-500" />
          Emergency Savings
        </h2>
      </div>
      
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
          
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
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
              <div class="text-sm font-bold text-gray-900">{{ formatCurrency(store.config.deposit.cashSavings) }}</div>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Essential Expenses -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-home" class="text-primary-500" />
          Essential Expenses
          <span class="text-xs font-normal text-gray-400">Groceries, Rent, Bills</span>
        </h2>
        <UButton icon="i-heroicons-plus" size="xs" color="primary" variant="soft" label="Add Essential" @click="addItem('essential')" />
      </div>

      <div class="space-y-2">
        <div v-for="item in essentialItems" :key="item.id" class="bg-white border border-gray-100 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="item.name" variant="none" placeholder="Name" class="flex-1 font-medium text-gray-900" />
              <div class="flex items-center gap-2">
                <UInput v-model="item.amount" type="number" step="0.01" class="w-24 text-right" size="sm">
                  <template #leading>
                    <span class="text-gray-400 text-xs">$</span>
                  </template>
                </UInput>
                <USelect v-model="item.frequency" :items="frequencies" size="sm" class="w-32" />
              </div>
              <div class="w-28 text-right px-2 border-l border-gray-50">
                <div class="text-sm font-bold text-gray-900">{{ formatCurrency(toFortnightlyAmount(item)) }}</div>
                <div class="text-[10px] text-gray-400">per fn</div>
              </div>
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeItem(item.id)" />
            </div>
            
            <div class="flex items-center gap-4 pt-2 border-t border-gray-50">
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
        <div v-if="essentialItems.length === 0" class="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
          No essential expenses added yet.
        </div>
      </div>
    </section>

    <!-- Recurring Expenses -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-path" class="text-orange-500" />
          Recurring Expenses
          <span class="text-xs font-normal text-gray-400">Insurance, Subscriptions</span>
        </h2>
        <UButton icon="i-heroicons-plus" size="xs" color="warning" variant="soft" label="Add Recurring" @click="addItem('recurring')" />
      </div>

      <div class="space-y-2">
        <div v-for="item in recurringItems" :key="item.id" class="bg-white border border-gray-100 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="item.name" variant="none" placeholder="Name" class="flex-1 font-medium text-gray-900" />
              <div class="flex items-center gap-2">
                <UInput v-model="item.amount" type="number" step="0.01" class="w-24 text-right" size="sm">
                  <template #leading>
                    <span class="text-gray-400 text-xs">$</span>
                  </template>
                </UInput>
                <USelect v-model="item.frequency" :items="frequencies" size="sm" class="w-32" />
              </div>
              <div class="w-28 text-right px-2 border-l border-gray-50">
                <div class="text-sm font-bold text-gray-900">{{ formatCurrency(toFortnightlyAmount(item)) }}</div>
                <div class="text-[10px] text-gray-400">per fn</div>
              </div>
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeItem(item.id)" />
            </div>

            <div class="flex items-center gap-4 pt-2 border-t border-gray-50">
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
        <div v-if="recurringItems.length === 0" class="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
          No recurring expenses added yet.
        </div>
      </div>
    </section>

    <!-- One-Off Expenses -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-minus-circle" class="text-red-500" />
          One-Off Expenses
          <span class="text-xs font-normal text-gray-400">Specific dates (e.g. Car repair)</span>
        </h2>
        <UButton 
          icon="i-heroicons-plus" 
          size="xs" 
          color="error" 
          variant="soft" 
          label="Add Expense" 
          @click="addOneOffExpense" 
        />
      </div>
      
      <div class="space-y-2">
        <div v-for="(expense, idx) in budgetConfig.oneOffExpenses" :key="expense.id" class="bg-white border border-gray-100 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="flex items-center gap-3">
            <UInput v-model="expense.name" variant="none" placeholder="Description" class="flex-1 font-medium text-gray-900" />
            <div class="flex items-center gap-2">
              <UInput v-model="expense.amount" type="number" class="w-24 text-right" size="sm">
                <template #leading>
                  <span class="text-gray-400 text-xs">$</span>
                </template>
              </UInput>
              <UInput :model-value="expense.date" @update:model-value="val => expense.date = val" type="date" class="w-36" size="sm" />
            </div>
            <UButton 
              icon="i-heroicons-trash" 
              color="error" 
              variant="ghost" 
              size="xs" 
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeOneOffExpense(idx)" 
            />
          </div>
        </div>
        <div v-if="!budgetConfig.oneOffExpenses?.length" class="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
          No one-off expenses planned.
        </div>
      </div>
    </section>

    <!-- Expected Deposits -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-plus-circle" class="text-green-500" />
          Expected Deposits
          <span class="text-xs font-normal text-gray-400">Gifts, Sales, Tax Returns</span>
        </h2>
        <UButton 
          icon="i-heroicons-plus" 
          size="xs" 
          color="success" 
          variant="soft" 
          label="Add Deposit" 
          @click="addOneOffDeposit" 
        />
      </div>
      
      <div class="space-y-2">
        <div v-for="(deposit, idx) in budgetConfig.oneOffDeposits" :key="deposit.id" class="bg-white border border-gray-100 rounded-xl p-3 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="flex items-center gap-3">
            <UInput v-model="deposit.name" variant="none" placeholder="Description" class="flex-1 font-medium text-gray-900" />
            <div class="flex items-center gap-2">
              <UInput v-model="deposit.amount" type="number" class="w-24 text-right" size="sm">
                <template #leading>
                  <span class="text-gray-400 text-xs">$</span>
                </template>
              </UInput>
              <UInput :model-value="deposit.date" @update:model-value="val => deposit.date = val" type="date" class="w-36" size="sm" />
            </div>
            <UButton 
              icon="i-heroicons-trash" 
              color="error" 
              variant="ghost" 
              size="xs" 
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeOneOffDeposit(idx)" 
            />
          </div>
        </div>
        <div v-if="!budgetConfig.oneOffDeposits?.length" class="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
          No expected deposits.
        </div>
      </div>
    </section>

    <!-- Savings Goals -->
    <section class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-rocket-launch" class="text-emerald-500" />
          Savings Goals
          <span class="text-xs font-normal text-gray-400">Targets with auto-calculated savings</span>
        </h2>
        <UButton icon="i-heroicons-plus" size="xs" color="success" variant="soft" label="Add Goal" @click="addItem('goal')" />
      </div>

      <div class="space-y-3">
        <div v-for="item in goalItems" :key="item.id" class="bg-white border border-gray-100 rounded-xl p-4 shadow-xs hover:shadow-sm transition-shadow group">
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-3">
              <UInput v-model="item.name" variant="none" placeholder="Goal Name" class="flex-1 font-bold text-lg text-gray-900" />
              <div class="flex items-center gap-2">
                <UInput v-model="item.amount" type="number" step="1" class="w-32 text-right" size="md">
                  <template #leading>
                    <span class="text-gray-400 text-xs">$</span>
                  </template>
                </UInput>
                <div class="text-sm text-gray-400 font-medium">Target</div>
              </div>
              <div class="w-32 text-right px-3 border-l border-gray-50">
                <div class="text-lg font-black text-emerald-600">{{ formatCurrency(toFortnightlyAmount(item)) }}</div>
                <div class="text-[10px] text-gray-400">per fn needed</div>
              </div>
              <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeItem(item.id)" />
            </div>

            <div class="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-50">
              <div class="flex-1 min-w-[200px] space-y-1">
                <div class="flex justify-between text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  <span>Target Date</span>
                  <div class="flex items-center gap-2">
                    <UBadge v-if="isGoalComplete(item)" label="Overdue" color="error" variant="subtle" size="xs" />
                    <span :class="isGoalComplete(item) ? 'text-red-600' : 'text-emerald-600'">
                      {{ getFortnightsRemaining(item.deadline!) }} fortnights left
                    </span>
                  </div>
                </div>
                <UInput v-model="item.deadline" type="date" size="sm" class="w-full" />
              </div>
              
              <div class="space-y-1">
                <div class="text-[10px] font-bold uppercase tracking-wide text-gray-500">Goal Type</div>
                <USelect v-model="item.goalType" :items="goalTypes" size="sm" class="w-40" />
              </div>

              <div class="pt-4">
                <UButton label="Mark Spent / Complete" icon="i-heroicons-check" size="xs" color="success" variant="soft" @click="markComplete(item.id)" />
              </div>
            </div>
          </div>
        </div>
        <div v-if="goalItems.length === 0" class="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
          No active goals.
        </div>
      </div>
    </section>

    <!-- Completed Items -->
    <section v-if="completedItems.length > 0" class="space-y-3 pt-6 border-t border-gray-100">
      <div class="px-1 flex items-center justify-between">
        <h2 class="text-sm font-bold text-gray-500 flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-gray-400" />
          Completed / Spent
        </h2>
      </div>

      <div class="space-y-2">
        <div v-for="item in completedItems" :key="item.id" class="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-xs group opacity-90 hover:opacity-100 transition-opacity">
          <div class="flex items-center gap-3">
            <UInput v-model="item.name" variant="none" placeholder="Name" class="flex-1 font-bold text-gray-500 line-through" />
            <div class="text-right px-3 border-l border-gray-200">
              <div class="text-xs font-bold text-gray-400">Completed</div>
              <div class="text-[10px] text-gray-400">{{ item.completedAt || item.deadline }}</div>
            </div>
            <UButton label="Restore" icon="i-heroicons-arrow-path" size="xs" color="primary" variant="ghost" @click="restoreItem(item.id)" />
            <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="removeItem(item.id)" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

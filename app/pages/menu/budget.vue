<script setup lang="ts">
import type { BudgetItem } from '~/types'

const store = useSessionStore()

const groupedItems = computed(() => {
  const groups: Record<string, BudgetItem[]> = { essential: [], recurring: [], goal: [] }
  const items = store.config.budget?.budgetItems ?? []
  items.forEach(item => {
    const group = groups[item.category]
    if (group) group.push(item)
  })
  return groups
})

const categoryTotals = computed(() => {
  const totals: Record<string, number> = { essential: 0, recurring: 0, goal: 0 }
  const items = store.config.budget?.budgetItems ?? []
  items.forEach(item => {
    const currentTotal = totals[item.category]
    if (currentTotal !== undefined) totals[item.category] = currentTotal + item.amount
  })
  return totals
})

const totalBudget = computed(() => (store.config.budget?.budgetItems ?? []).reduce((acc, i) => acc + i.amount, 0))

function addItem() {
  if (!store.config.budget?.budgetItems) return
  store.config.budget.budgetItems.push({
    id: crypto.randomUUID(),
    name: 'New Item',
    amount: 0,
    category: 'essential',
    frequency: 'fortnightly'
  })
}

function removeItem(id: string) {
  const index = store.config.budget.budgetItems.findIndex(i => i.id === id)
  if (index !== -1) store.config.budget.budgetItems.splice(index, 1)
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Budget Items</h3>
            </div>
          </template>
          <div class="space-y-8">
            <section v-for="(items, category) in groupedItems" :key="category">
              <h4 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{{ category }}</h4>
              <div class="space-y-3">
                <div v-for="item in items" :key="item.id" class="flex items-center gap-4 group">
                  <div class="flex-1 min-w-0">
                    <UInput v-model="item.name" variant="none" class="font-medium p-0" />
                  </div>
                  <div class="w-32">
                    <UInput v-model.number="item.amount" type="number" step="10" size="sm">
                      <template #leading>$</template>
                    </UInput>
                  </div>
                  <UButton
                    icon="i-heroicons-trash"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100"
                    @click="removeItem(item.id)"
                  />
                </div>
              </div>
            </section>
            
            <UButton
              icon="i-heroicons-plus"
              label="Add Budget Item"
              color="neutral"
              variant="outline"
              block
              @click="addItem"
            />
          </div>
        </UCard>
      </div>

      <div class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Fortnightly Summary</h3>
          </template>
          <div class="space-y-4">
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span class="text-sm text-gray-500">Essential</span>
              <span class="font-bold text-error-600">{{ formatCurrency(categoryTotals.essential) }}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span class="text-sm text-gray-500">Recurring</span>
              <span class="font-bold text-warning-600">{{ formatCurrency(categoryTotals.recurring) }}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <span class="text-sm font-semibold text-primary-700 dark:text-primary-300">Total Budget</span>
              <span class="font-black text-primary-600">{{ formatCurrency(totalBudget) }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

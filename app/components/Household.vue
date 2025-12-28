<script setup lang="ts">
import { useSessionStore } from '~/composables/useSessionStore'
import { formatCurrency, formatDateLabel } from '~/composables/useFormatter'
import { useHecsCalculator } from '~/composables/useHecsCalculator'
import type { IncomeType, Person } from '~/types'

const store = useSessionStore()
const { projectHecsBalance } = useHecsCalculator()
const router = useRouter()

const isAddingPerson = ref(false)
const newPersonName = ref('')
const editingPerson = ref<Person | null>(null)
const isEditingPerson = computed({
  get: () => !!editingPerson.value,
  set: (val) => { if (!val) editingPerson.value = null }
})

function editPerson(person: Person) {
  editingPerson.value = person
}

function addHecsAddition() {
  if (!editingPerson.value?.hecsDebt) return
  if (!editingPerson.value.hecsDebt.scheduledAdditions) {
    editingPerson.value.hecsDebt.scheduledAdditions = []
  }
  editingPerson.value.hecsDebt.scheduledAdditions.push({
    id: crypto.randomUUID(),
    date: new Date().getFullYear() + '-03-31',
    amount: 5000,
    description: ''
  })
}

function removeHecsAddition(id: string) {
  if (!editingPerson.value?.hecsDebt?.scheduledAdditions) return
  editingPerson.value.hecsDebt.scheduledAdditions = editingPerson.value.hecsDebt.scheduledAdditions.filter(a => a.id !== id)
}

function handleAddPerson() {
  if (!newPersonName.value) return
  store.addPerson(newPersonName.value)
  newPersonName.value = ''
  isAddingPerson.value = false
}

function toggleHecs(val: boolean) {
  if (!editingPerson.value) return
  if (val) {
    editingPerson.value.hecsDebt = {
      balance: 30000,
      balanceAsOfDate: new Date().toISOString().split('T')[0] as string,
      indexationRate: 0.04
    }
  } else {
    delete editingPerson.value.hecsDebt
  }
}

const formatTargetDate = computed(() => formatDateLabel(store.config.deposit.targetDate, 'short'))

function getHecsProjection(person: Person) {
  if (!person.hecsDebt) return { projectedBalance: 0, totalRepayments: 0, totalIndexation: 0, totalAdditions: 0 }
  return projectHecsBalance(
    person.hecsDebt, 
    store.config.deposit.targetDate,
    store.config.incomeSources,
    person.id
  )
}

function getProjectedHecs(person: Person) {
  return getHecsProjection(person).projectedBalance
}

function getPersonIncomes(personId: string) {
  return store.config.incomeSources.filter(s => s.personId === personId)
}

const addIncomeOptions = [
  [
    {
      label: 'TMN / Missionary',
      icon: 'i-heroicons-academic-cap',
      onSelect: () => handleAdd('tmn')
    },
    {
      label: 'Salaried Job',
      icon: 'i-heroicons-briefcase',
      onSelect: () => handleAdd('salary')
    },
    {
      label: 'Centrelink Payment',
      icon: 'i-heroicons-building-library',
      onSelect: () => handleAdd('centrelink')
    }
  ]
]

function handleAdd(type: IncomeType) {
  // Add to the first person by default
  const personId = store.config.people[0]?.id
  const newSource = store.addIncomeSource(type, personId)
  router.push(`/income/${newSource.id}`)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-bold flex items-center gap-2">
        <UIcon name="i-heroicons-user-group" />
        Household Members
      </h2>
      <UButton icon="i-heroicons-plus" label="Add Person" color="primary" variant="subtle" size="sm" @click="isAddingPerson = true" />
    </div>

    <!-- People Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard v-for="person in store.config.people" :key="person.id" class="relative group">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
               <UIcon name="i-heroicons-user" class="text-xl" />
             </div>
             <div>
               <h3 class="font-bold text-gray-900">{{ person.name }}</h3>
               <p v-if="person.hecsDebt" class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Has HECS Debt</p>
               <p v-else class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">No HECS Debt</p>
             </div>
          </div>
          <div class="flex gap-1">
            <UButton icon="i-heroicons-pencil" variant="ghost" color="neutral" size="xs" @click="editPerson(person)" />
            <UButton 
              v-if="store.config.people.length > 1"
              icon="i-heroicons-trash" 
              variant="ghost" 
              color="error" 
              size="xs" 
              @click="store.removePerson(person.id)" 
            />
          </div>
        </div>

        <!-- HECS Summary -->
        <div v-if="person.hecsDebt" class="mt-4 pt-4 border-t border-gray-50">
           <div class="flex justify-between text-xs mb-1">
             <span class="text-gray-500">Current Balance</span>
             <span class="font-medium">{{ formatCurrency(person.hecsDebt.balance) }}</span>
           </div>
           <div v-if="getHecsProjection(person).totalAdditions > 0" class="flex justify-between text-xs mb-1">
             <span class="text-gray-500">Scheduled Additions</span>
             <span class="text-red-500 font-medium">+{{ formatCurrency(getHecsProjection(person).totalAdditions) }}</span>
           </div>
           <div class="flex justify-between text-xs text-primary-600">
             <span class="font-medium">Projected ({{ formatTargetDate }})</span>
             <span class="font-bold">{{ formatCurrency(getProjectedHecs(person)) }}</span>
           </div>
        </div>
      </UCard>
    </div>

    <!-- Modals -->
    <UModal v-model:open="isAddingPerson" title="Add Household Member">
      <template #content>
        <div class="p-4 space-y-4">
          <UFormField label="Name">
            <UInput v-model="newPersonName" placeholder="e.g. Dan" />
          </UFormField>
          <div class="flex justify-end gap-2">
             <UButton label="Cancel" variant="ghost" color="neutral" @click="isAddingPerson = false" />
             <UButton label="Add Member" color="primary" @click="handleAddPerson" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isEditingPerson" title="Edit Person & HECS">
      <template #content>
        <div v-if="editingPerson" class="p-4 space-y-6">
          <UFormField label="Name">
            <UInput v-model="editingPerson.name" />
          </UFormField>

          <div class="space-y-4 pt-4 border-t border-gray-100">
             <div class="flex items-center justify-between">
                <label class="text-sm font-medium">HECS / HELP Debt</label>
                <USwitch :model-value="!!editingPerson.hecsDebt" @update:model-value="toggleHecs" />
             </div>

             <div v-if="editingPerson.hecsDebt" class="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <UFormField label="Current Balance">
                  <UInput v-model="editingPerson.hecsDebt.balance" type="number" icon="i-heroicons-currency-dollar" />
                </UFormField>
                <UFormField label="Balance as of Date">
                  <UInput v-model="editingPerson.hecsDebt.balanceAsOfDate" type="date" />
                </UFormField>
                <UFormField label="Indexation Rate (Est)">
                  <template #label>
                    <div class="flex justify-between w-full">
                       <span>Indexation Rate</span>
                       <span class="text-primary-600 font-bold">{{ (editingPerson.hecsDebt.indexationRate * 100).toFixed(1) }}%</span>
                    </div>
                  </template>
                  <USlider v-model="editingPerson.hecsDebt.indexationRate" :min="0" :max="0.1" :step="0.001" />
                  <p class="text-[10px] text-gray-400 mt-1 italic">Default 4.0% (Lower of CPI/WPI cap).</p>
                </UFormField>

                <div class="pt-2 border-t border-gray-200">
                  <p class="text-xs font-bold text-gray-700 mb-1">Projection to {{ formatTargetDate }}</p>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Estimated Repayments:</span>
                    <span class="text-emerald-600 font-medium">-{{ formatCurrency(getHecsProjection(editingPerson).totalRepayments) }}</span>
                  </div>
                  <div v-if="getHecsProjection(editingPerson).totalAdditions > 0" class="flex justify-between text-xs">
                    <span class="text-gray-500">Scheduled Additions:</span>
                    <span class="text-red-600 font-medium">+{{ formatCurrency(getHecsProjection(editingPerson).totalAdditions) }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Estimated Indexation:</span>
                    <span class="text-red-600 font-medium">+{{ formatCurrency(getHecsProjection(editingPerson).totalIndexation) }}</span>
                  </div>
                </div>

                <div class="space-y-3 pt-4 border-t border-gray-200">
                  <div class="flex justify-between items-center">
                    <label class="text-xs font-bold text-gray-700 uppercase tracking-wider">Scheduled Additions</label>
                    <UButton icon="i-heroicons-plus" size="xs" variant="subtle" color="primary" label="Add Semester" @click="addHecsAddition" />
                  </div>
                  
                  <div class="space-y-2">
                    <div v-for="addition in editingPerson.hecsDebt.scheduledAdditions" :key="addition.id" 
                        class="flex flex-col gap-2 bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                      <UButton 
                        icon="i-heroicons-x-mark" 
                        size="xs" 
                        variant="ghost" 
                        color="neutral" 
                        class="absolute top-1 right-1" 
                        @click="removeHecsAddition(addition.id)" 
                      />
                      <div class="grid grid-cols-2 gap-2">
                        <UFormField label="Census Date" size="xs">
                          <UInput v-model="addition.date" type="date" size="xs" />
                        </UFormField>
                        <UFormField label="Amount" size="xs">
                          <UInput v-model="addition.amount" type="number" size="xs" icon="i-heroicons-currency-dollar" />
                        </UFormField>
                      </div>
                      <UFormField label="Description" size="xs">
                        <UInput v-model="addition.description" placeholder="e.g. Sem 1 Placement" size="xs" />
                      </UFormField>
                    </div>

                    <div v-if="!editingPerson.hecsDebt.scheduledAdditions?.length" 
                        class="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <p class="text-[10px] text-gray-400 italic">No future debt additions scheduled</p>
                    </div>
                  </div>
                </div>
              </div>

          </div>

          <div class="flex justify-end gap-2 pt-4">
             <UButton label="Done" color="primary" block @click="editingPerson = null" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

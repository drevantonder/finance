<script setup lang="ts">
const store = useSessionStore()
const { borrowingResult } = useProjectionResults()
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Affordability Summary</h3>
        </template>
        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div>
              <div class="text-sm text-gray-500">Affordable House Price</div>
              <div class="text-3xl font-bold text-primary-600">{{ formatCurrency(borrowingResult.costs.affordablePrice) }}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div class="text-gray-500">Stamp Duty</div>
              <div class="font-semibold">{{ formatCurrency(borrowingResult.costs.stampDuty) }}</div>
            </div>
            <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div class="text-gray-500">Total Fees</div>
              <div class="font-semibold">{{ formatCurrency(store.config.costs.legalCosts + store.config.costs.buildingAndPest) }}</div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Assumptions</h3>
        </template>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">First Home Buyer</span>
            <UToggle v-model="store.config.costs.isFirstHomeBuyer" />
          </div>
          <UFormGroup label="Property Type" help="Affects stamp duty concessions">
            <URadioGroup
              v-model="store.config.costs.propertyType"
              :options="[
                { label: 'Existing Home', value: 'existing' },
                { label: 'New Home / Land', value: 'new' }
              ]"
            />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Legal Fees">
              <UInput v-model.number="store.config.costs.legalCosts" type="number">
                <template #leading>$</template>
              </UInput>
            </UFormGroup>
            <UFormGroup label="Building & Pest">
              <UInput v-model.number="store.config.costs.buildingAndPest" type="number">
                <template #leading>$</template>
              </UInput>
            </UFormGroup>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

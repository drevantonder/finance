<script setup lang="ts">
const store = useSessionStore()
const { borrowingResult } = useProjectionResults()
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Serviceability Limit</h3>
        </template>
        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div>
              <div class="text-sm text-gray-500">Max Borrowing</div>
              <div class="text-3xl font-bold text-primary-600">{{ formatCurrency(borrowingResult.serviceabilityCapacity) }}</div>
            </div>
          </div>
          <UProgress :value="100" color="primary" />
          <div class="text-xs text-gray-400">Based on HEM and Net Monthly Surplus</div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">DTI Limit ({{ store.config.loan.dtiCap }}x)</h3>
        </template>
        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div>
              <div class="text-sm text-gray-500">Max Borrowing</div>
              <div class="text-3xl font-bold text-warning-600">{{ formatCurrency(borrowingResult.dtiCapacity) }}</div>
            </div>
          </div>
          <UProgress :value="100" color="warning" />
          <div class="text-xs text-gray-400">Based on Total Gross Annual Income</div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Bank Assumptions</h3>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-6">
          <SmartSlider
            v-model="store.config.loan.interestRate"
            label="Assessment Rate"
            :min="0.05"
            :max="0.12"
            :step="0.001"
            is-percent
          />
          <SmartSlider
            v-model="store.config.loan.loanTerm"
            label="Loan Term"
            :min="10"
            :max="30"
            :step="1"
            suffix=" years"
          />
        </div>
        <div class="space-y-6">
          <SmartSlider
            v-model="store.config.loan.dtiCap"
            label="DTI Cap"
            :min="4"
            :max="9"
            :step="0.5"
            suffix="x"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>

import type { Expense } from '~/types'
import { useAuthToken } from '~/composables/useAuthToken'

// Global State (Singleton Pattern)
const expenses = ref<Expense[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const isProcessing = ref<Record<string, boolean>>({})

export function useExpenses() {
  const { token } = useAuthToken()

  async function fetchExpenses() {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<Expense[]>('/api/expenses', {
        headers: { 'x-auth-token': token.value }
      })
      expenses.value = data
    } catch (err: any) {
      error.value = err.statusMessage || 'Failed to fetch expenses'
    } finally {
      isLoading.value = false
    }
  }

  async function uploadReceipt(image: string, capturedAt: string, imageHash: string) {
    isLoading.value = true
    error.value = null
    try {
      const newExpense = await $fetch<Expense>('/api/expenses', {
        method: 'POST',
        headers: { 'x-auth-token': token.value },
        body: { image, capturedAt, imageHash }
      })
      expenses.value = [newExpense, ...expenses.value]
      return newExpense
    } catch (err: any) {
      error.value = err.statusMessage || 'Failed to upload receipt'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateExpense(id: string, updates: Partial<Expense>) {
    try {
      const updated = await $fetch<Expense>(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'x-auth-token': token.value },
        body: updates
      })
      const index = expenses.value.findIndex(e => e.id === id)
      if (index !== -1) {
        expenses.value[index] = updated
      }
      return updated
    } catch (err: any) {
      error.value = err.statusMessage || 'Failed to update expense'
      throw err
    }
  }

  async function deleteExpense(id: string) {
    try {
      await $fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token.value }
      })
      expenses.value = expenses.value.filter(e => e.id !== id)
    } catch (err: any) {
      error.value = err.statusMessage || 'Failed to delete expense'
      throw err
    }
  }

  async function processExpense(id: string) {
    isProcessing.value = { ...isProcessing.value, [id]: true }
    try {
      const updated = await $fetch<Expense>(`/api/expenses/${id}/process`, {
        method: 'POST',
        headers: { 'x-auth-token': token.value }
      })
      
      const index = expenses.value.findIndex(e => e.id === id)
      if (index !== -1) {
        expenses.value[index] = { ...updated }
      }
      return updated
    } catch (err: any) {
      error.value = err.statusMessage || 'Failed to process expense'
      throw err
    } finally {
      isProcessing.value = { ...isProcessing.value, [id]: false }
    }
  }

  function getImageUrl(id: string) {
    return `/api/expenses/${id}/image`
  }

  return {
    expenses,
    isLoading,
    isProcessing,
    error,
    fetchExpenses,
    uploadReceipt,
    updateExpense,
    deleteExpense,
    processExpense,
    getImageUrl
  }
}


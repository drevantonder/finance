import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/types/queries'
import type { Expense } from '~/types'

export function useExpensesQuery() {
  return useQuery({
    queryKey: queryKeys.expenses.all,
    queryFn: () => $fetch<Expense[]>('/api/expenses'),
  })
}

export function useExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expense: Partial<Expense> & { id?: string }) => {
      if (expense.id) {
        return $fetch<Expense>(`/api/expenses/${expense.id}`, {
          method: 'PUT',
          body: expense,
        })
      }
      return $fetch<Expense>('/api/expenses', {
        method: 'POST',
        body: expense,
      })
    },
    onMutate: async (newExpense) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      // Snapshot current state
      const previousExpenses = queryClient.getQueryData<Expense[]>(queryKeys.expenses.all)

      // Optimistically update
      queryClient.setQueryData<Expense[]>(queryKeys.expenses.all, (old = []) => {
        if (newExpense.id) {
          // Update existing
          return old.map(e => e.id === newExpense.id ? { ...e, ...newExpense } as Expense : e)
        }
        // Add new with temp ID
        const optimistic = { ...newExpense, id: crypto.randomUUID(), createdAt: new Date().toISOString(), capturedAt: new Date().toISOString() } as Expense
        return [...old, optimistic]
      })

      return { previousExpenses }
    },
    onError: (_err, _newExpense, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.all, context.previousExpenses)
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => $fetch(`/api/expenses/${id}`, { method: 'DELETE' as "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })
      const previousExpenses = queryClient.getQueryData<Expense[]>(queryKeys.expenses.all)
      
      queryClient.setQueryData<Expense[]>(queryKeys.expenses.all, (old = []) => 
        old.filter(e => e.id !== id)
      )

      return { previousExpenses }
    },
    onError: (_err, _id, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.all, context.previousExpenses)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

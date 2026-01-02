import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/types/queries'
import type { ExpenseClaim, Claim, Expense } from '~/types'

// Response type for expense claims with joined expense
export interface ExpenseClaimWithExpense {
  id: string | null
  expenseId: string | null
  claimId: string | null
  ptcCategory: string | null
  mfbPercent: number | null
  mfbAmount: number | null
  mmrAmount: number | null
  gstAmount: number | null
  status: string | null
  createdAt: string | null
  claimedAt: string | null
  expense: Expense
}

export function useExpenseClaimsQuery(status: string = 'pending') {
  return useQuery({
    queryKey: queryKeys.expenseClaims.byStatus(status),
    queryFn: async () => {
      const data = await $fetch<ExpenseClaimWithExpense[]>(`/api/expense-claims?status=${status}`)
      return data
    },
  })
}

export function useClaimsQuery() {
  return useQuery({
    queryKey: queryKeys.claims.history,
    queryFn: async () => {
      const data = await $fetch<Claim[]>('/api/claims')
      return data
    },
  })
}

export function useExpenseClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<ExpenseClaim> & { id?: string, expenseId?: string }): Promise<unknown> => {
      if (data.id) {
        return await $fetch(`/api/expense-claims/${data.id}`, { method: 'PUT', body: data })
      }
      return await $fetch('/api/expense-claims', { method: 'POST', body: data })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseClaims.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.claims.all })
    }
  })
}

export function useBulkExpenseClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { expenseIds: string[], action: 'archive' | 'unarchive' | 'claim', claimId?: string }): Promise<unknown> => {
      return await $fetch('/api/expense-claims/bulk', { method: 'PUT', body: data })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseClaims.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.claims.all })
    }
  })
}

export function useCreateClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Claim> & { expenseClaimIds: string[] }): Promise<unknown> => {
      return await $fetch('/api/claims', { method: 'POST', body: data })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.claims.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseClaims.all })
    }
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/types/queries'
import type { Expense } from '~/types'

// Define InboxItem interface here since it might be missing from types
export interface InboxItem {
  id: string
  fromAddress: string
  toAddress: string | null
  envelopeFrom: string | null
  subject: string | null
  textBody: string | null
  htmlBody: string | null
  receivedAt: string
  status: 'pending' | 'processing' | 'complete' | 'error' | 'ignored' | 'unauthorized'
  verified: boolean
  errorMessage: string | null
  expenseId: string | null
  createdAt: string
  attachments?: any[]
}

export function useInboxQuery() {
  return useQuery({
    queryKey: queryKeys.inbox.all,
    queryFn: () => $fetch<InboxItem[]>('/api/inbox'),
    refetchInterval: (query) => {
      // Poll every 5s if any items are processing
      const data = query.state.data
      const hasProcessing = data?.some(item => item.status === 'processing')
      return hasProcessing ? 5_000 : false
    },
  })
}

export function useApproveInboxMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await $fetch(`/api/inbox/${id}/approve`, { method: 'post' as const })
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useProcessInboxMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await $fetch(`/api/inbox/${id}/process`, { method: 'post' as const })
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.all })
      const previous = queryClient.getQueryData<InboxItem[]>(queryKeys.inbox.all)
      
      // Optimistically set to processing
      queryClient.setQueryData<InboxItem[]>(queryKeys.inbox.all, (old = []) =>
        old.map(item => item.id === id ? { ...item, status: 'processing' } : item)
      )

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.inbox.all, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all })
    },
  })
}

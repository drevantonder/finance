import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/types/queries'
import type { Category } from '~/types'

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => $fetch<Category[]>('/api/categories'),
    staleTime: 60_000, // Categories change rarely
  })
}

export function useCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (category: Partial<Category> & { id?: string }) => {
      if (category.id) {
        return $fetch<Category>(`/api/categories/${category.id}`, {
          method: 'PUT',
          body: category,
        })
      }
      return $fetch<Category>('/api/categories', {
        method: 'POST',
        body: category,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await $fetch(`/api/categories/${id}`, { method: 'DELETE' as const })
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

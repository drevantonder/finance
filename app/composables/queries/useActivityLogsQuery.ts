import { useQuery } from '@tanstack/vue-query'
import type { ActivityLog } from '~/types'

export const useActivityLogsQuery = (
  params: { stage?: string; hours?: number; limit?: number } = {}
) => {
  return useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params.stage) queryParams.append('stage', params.stage)
      if (params.hours) queryParams.append('hours', String(params.hours))
      if (params.limit) queryParams.append('limit', String(params.limit))

      return await $fetch<ActivityLog[]>(
        `/api/logs?${queryParams.toString()}`
      )
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 // 1 minute
  })
}

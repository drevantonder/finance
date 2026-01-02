// Query keys - centralized for consistency
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    detail: (id: string) => ['expenses', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  inbox: {
    all: ['inbox'] as const,
    detail: (id: string) => ['inbox', id] as const,
  },
  session: {
    all: ['session'] as const,
  },
  claims: {
    all: ['claims'] as const,
    history: ['claims', 'history'] as const,
    pending: ['claims', 'pending'] as const,
    archived: ['claims', 'archived'] as const,
  },
  expenseClaims: {
    all: ['expense-claims'] as const,
    byStatus: (status: string) => ['expense-claims', status] as const,
  },
} as const

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
} as const

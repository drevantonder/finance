import type { Category } from '~/types'

export const useCategories = () => {
  const categories = useState<Category[]>('categories', () => [])
  const isLoading = useState('categories-loading', () => false)

  async function fetchCategories() {
    // Return cached if available
    if (categories.value.length > 0) return

    isLoading.value = true
    try {
      categories.value = await $fetch('/api/categories')
    } catch (err) {
      console.error('Failed to fetch categories', err)
    } finally {
      isLoading.value = false
    }
  }

  function getCategoryColor(name: string): string {
    const cat = categories.value.find(c => c.name.toLowerCase() === name.toLowerCase())
    return cat?.color || '#9ca3af' // Default to gray-400 if not found
  }

  // Pre-defined palette for the picker
  const colorPalette = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#f43f5e', // Rose
    '#6b7280', // Gray
  ]

  return {
    categories,
    isLoading,
    fetchCategories,
    getCategoryColor,
    colorPalette
  }
}
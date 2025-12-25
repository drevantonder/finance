<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Category } from '~/types'
import { useCategoriesQuery, useCategoryMutation, useDeleteCategoryMutation } from '~/composables/queries'

const { data: categories = [], isLoading } = useCategoriesQuery()
const { mutateAsync: createCategory } = useCategoryMutation()
const { mutateAsync: updateCategoryMutation } = useCategoryMutation()
const { mutateAsync: deleteCategoryMutation } = useDeleteCategoryMutation()

const colorPalette = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', 
  '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
]

const toast = useToast()

// Create State
const isCreateModalOpen = ref(false)
const newCategory = ref({ name: '', description: '', color: colorPalette[7] })

// Delete State
const deleteTarget = ref<Category | null>(null)
const isDeleteModalOpen = computed({
  get: () => !!deleteTarget.value,
  set: (val) => { if (!val) deleteTarget.value = null }
})

function startCreate() {
  newCategory.value = { name: '', description: '', color: colorPalette[Math.floor(Math.random() * colorPalette.length)] }
  isCreateModalOpen.value = true
}

async function handleCreate() {
  if (!newCategory.value.name.trim()) return
  
  try {
    await createCategory(newCategory.value)
    isCreateModalOpen.value = false
  } catch (err) {
    toast.add({ title: 'Error adding category', color: 'error' })
  }
}

async function updateCategory(cat: Category) {
  try {
    await updateCategoryMutation(cat)
  } catch (err) {
    toast.add({ title: 'Error updating category', color: 'error' })
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  
  try {
    await deleteCategoryMutation(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (err) {
    toast.add({ title: 'Error deleting category', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">Expense Categories</h2>
        <p class="text-sm text-gray-500">Define categories and descriptions to help Gemini categorize your receipts.</p>
      </div>
      <UButton icon="i-heroicons-plus" size="sm" @click="startCreate">Add Category</UButton>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="isCreateModalOpen" title="Add Category" description="Create a new category for your expenses.">
      <template #content>
        <div class="p-4 space-y-4">
          <UFormField label="Name" required>
            <UInput v-model="newCategory.name" placeholder="e.g. Groceries" autofocus @keyup.enter="handleCreate" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="newCategory.description" placeholder="Used for food and household items..." />
          </UFormField>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Color</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colorPalette"
                :key="color"
                type="button"
                class="w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-gray-400"
                :class="{ 'ring-2 ring-offset-1 ring-offset-white ring-gray-900 scale-110': newCategory.color === color }"
                :style="{ backgroundColor: color }"
                @click="newCategory.color = color"
              />
            </div>
          </div>
          
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">Cancel</UButton>
            <UButton :disabled="!newCategory.name.trim()" @click="handleCreate">Create Category</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Delete Category" description="Are you sure? Expenses using this category will become uncategorized.">
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="deleteTarget = null">Cancel</UButton>
        <UButton color="error" @click="confirmDelete">Delete Category</UButton>
      </template>
    </UModal>

    <div class="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      <div v-if="isLoading" class="p-8 text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-gray-400 mx-auto" />
      </div>
      
      <div v-else-if="categories.length === 0" class="p-8 text-center text-gray-400 italic text-sm">
        No categories defined.
      </div>

      <div v-else v-for="cat in (categories || [])" :key="cat.id" class="p-4 group flex items-start gap-4">
        <UPopover>
          <button 
            type="button"
            class="w-6 h-6 rounded-full border border-gray-200 mt-1 cursor-pointer transition-transform hover:scale-105"
            :style="{ backgroundColor: cat.color || '#6366f1' }"
          />
          <template #content>
            <div class="p-2 grid grid-cols-4 gap-2">
              <button
                v-for="color in colorPalette"
                :key="color"
                class="w-5 h-5 rounded-full border border-gray-100 hover:scale-110 transition-transform"
                :style="{ backgroundColor: color }"
                @click="cat.color = color; updateCategory(cat)"
              />
            </div>
          </template>
        </UPopover>
        
        <div class="flex-1 space-y-1">
          <input 
            v-model="cat.name" 
            @blur="updateCategory(cat)"
            class="block w-full text-sm font-semibold text-gray-900 bg-transparent focus:outline-none focus:text-primary-600 transition-colors"
          />
          <textarea 
            v-model="cat.description" 
            @blur="updateCategory(cat)"
            rows="1"
            placeholder="Describe this category for AI context..."
            class="block w-full text-xs text-gray-500 bg-transparent resize-none focus:outline-none focus:text-gray-900 transition-colors"
          ></textarea>
        </div>

        <UButton 
          icon="i-heroicons-trash" 
          color="error" 
          variant="ghost" 
          size="xs" 
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @click="deleteTarget = cat"
        />
      </div>
    </div>
  </div>
</template>

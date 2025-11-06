// src/Components/RecipesList.tsx
'use client'

import { Title, Button, Group, ActionIcon, Text } from '@mantine/core'
import { Table } from '@mantine/core'
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import Link from 'next/link'
import { useState } from 'react'
import { deleteRecipe } from '@/lib/actions'
import { showSuccess, showError } from '@/lib/notifications'
import { ConfirmationModal } from './ConfirmationModal'

interface Recipe {
  id: string
  name: string
  recipe_items: Array<{
    item: { name: string }
    amount: string | null
  }>
}

interface RecipesListProps {
  recipes: Recipe[]
}

export function RecipesList({ recipes: initialRecipes }: RecipesListProps) {
  // Local state for optimistic updates
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteClick = (recipe: Recipe) => {
    setRecipeToDelete(recipe)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return

    setDeleting(true)

    // Optimistic update - remove recipe from list immediately
    setRecipes(prev => prev.filter(r => r.id !== recipeToDelete.id))
    setDeleteModalOpen(false)
    const deletedRecipe = recipeToDelete
    setRecipeToDelete(null)

    const result = await deleteRecipe(deletedRecipe.id)

    // If deletion failed, add the recipe back
    if (!result.success) {
      setRecipes(prev => [...prev, deletedRecipe])
      showError(result.error || 'Failed to delete recipe')
    } else {
      showSuccess(`Recipe "${deletedRecipe.name}" deleted successfully`)
    }

    setDeleting(false)
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setRecipeToDelete(null)
  }

  const rows = recipes.map((recipe) => (
    <tr key={recipe.id}>
      <td><Text>{recipe.name}</Text></td>
      <td style={{ textAlign: 'center' }}><Text>{recipe.recipe_items.length} ingredients</Text></td>
      <td style={{ textAlign: 'right' }}>
        <Group gap="xs" justify="flex-end">
          <ActionIcon
            component={Link}
            href={`/recipes/${recipe.id}`}
            variant="subtle"
            color="blue"
            size="sm"
            aria-label="Edit recipe"
          >
            <IconEdit />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => handleDeleteClick(recipe)}
            aria-label={`Delete ${recipe.name}`}
          >
            <IconTrash />
          </ActionIcon>
        </Group>
      </td>
    </tr>
  ))

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Recipes</Title>
        <Button
          component={Link}
          href="/recipes/new"
          leftSection={<IconPlus size={16} />}
        >
          Add Recipe
        </Button>
      </Group>

      {recipes.length === 0 ? (
        <Text c="dimmed">No recipes yet. Add your first recipe to get started!</Text>
      ) : (
        <Table>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Name</th>
              <th style={{ width: '30%', textAlign: 'center' }}>Ingredients</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${recipeToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Recipe"
        loading={deleting}
      />
    </>
  )
}
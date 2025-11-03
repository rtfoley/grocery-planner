// src/components/RecipeForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from '@mantine/form'
import {
  TextInput,
  Button,
  Group,
  ActionIcon,
  Stack,
  Box,
  Alert
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { createRecipe, updateRecipe, getItems } from '@/lib/actions'
import { ItemAutocomplete } from './ItemAutocomplete'
import { showSuccess, showError } from '@/lib/notifications'

interface Ingredient {
  item: string
  amount: string
}

interface RecipeFormProps {
  initialData?: {
    name: string
    ingredients: Ingredient[]
  }
  isEdit?: boolean
  recipeId?: string
}

export function RecipeForm({ initialData, isEdit = false, recipeId }: RecipeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemNames, setItemNames] = useState<string[]>([])

  const form = useForm({
    initialValues: {
      name: initialData?.name || '',
      ingredients: initialData?.ingredients || [{ item: '', amount: '' }]
    },
    validate: {
      name: (value) => value.trim().length < 1 ? 'Recipe name is required' : null,
      ingredients: {
        item: (value) => value.trim().length < 1 ? 'Item name is required' : null
      }
    }
  })

  // Load items once for all autocomplete components
  useEffect(() => {
    const loadItems = async () => {
      try {
        const itemData = await getItems()
        setItemNames(itemData.map(item => item.name))
      } catch (error) {
        console.error('Failed to load items:', error)
      }
    }

    loadItems()
  }, [])

  const addIngredient = () => {
    form.insertListItem('ingredients', { item: '', amount: '' })
  }

  const removeIngredient = (index: number) => {
    form.removeListItem('ingredients', index)
  }

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true)
    setError(null)

    // Filter out empty ingredients
    const validIngredients = values.ingredients.filter(ing => ing.item.trim().length > 0)

    if (validIngredients.length === 0) {
      setError('At least one ingredient is required')
      setLoading(false)
      return
    }

    const result = isEdit && recipeId
      ? await updateRecipe(recipeId, values.name, validIngredients)
      : await createRecipe(values.name, validIngredients)

    if (result.success) {
      showSuccess(`Recipe "${values.name}" ${isEdit ? 'updated' : 'created'} successfully`)
      router.push('/recipes')
    } else {
      setError(result.error || 'Failed to save recipe')
      showError(result.error || 'Failed to save recipe')
    }

    setLoading(false)
  }

  return (
    <Box maw={600}>
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}
      
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Recipe Name"
            placeholder="Enter recipe name"
            {...form.getInputProps('name')}
            required
          />

          <div>
            <Group justify="space-between" mb="xs">
              <strong>Ingredients</strong>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={addIngredient}
              >
                Add Ingredient
              </Button>
            </Group>

            <Stack gap="xs">
              {form.values.ingredients.map((ingredient, index) => (
                <Group key={index} align="flex-end">
                  <ItemAutocomplete
                    label={index === 0 ? "Item" : undefined}
                    placeholder="Enter item name"
                    style={{ flex: 2 }}
                    items={itemNames}
                    {...form.getInputProps(`ingredients.${index}.item`)}
                  />
                  <TextInput
                    label={index === 0 ? "Amount" : undefined}
                    placeholder="e.g. 2 cups"
                    style={{ flex: 1 }}
                    {...form.getInputProps(`ingredients.${index}.amount`)}
                  />
                  {form.values.ingredients.length > 1 && (
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeIngredient(index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
            </Stack>
          </div>

          <Group justify="flex-end" mt="xl">
            <Button variant="subtle" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? 'Update Recipe' : 'Save Recipe'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Box>
  )
}
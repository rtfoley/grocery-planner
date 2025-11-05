// src/Components/MealList.tsx - Unified meal planning view for all screen sizes
'use client'

import { MealWithDetails, RecipeWithItems, Item } from "@/lib/types";
import { getAdjustedDateFromString } from "@/lib/utilities";
import { Card, Title, Stack, Group, Text, ActionIcon, Button, Paper, Grid } from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { MealDialogData } from "./MealDialog";
import { AddRecipeDialog } from "./AddRecipeDialog";
import { AddItemDialog } from "./AddItemDialog";

interface MealListProps {
  meals: MealWithDetails[];
  sessionStartDate: string | null;
  sessionEndDate: string | null;
  recipes: RecipeWithItems[];
  allItems: Item[];
  onAddMeal: (date: string | null, mealData: MealDialogData) => Promise<void>;
  onUpdateMeal: (mealId: string, mealData: MealDialogData) => Promise<void>;
  onDeleteMeal: (mealId: string) => Promise<void>;
}

interface DayMeals {
  date: string
  dateObj: Date
  dinner: MealWithDetails | null
}

interface DialogState {
  isOpen: boolean
  day: DayMeals | null
  mealType: 'Dinner' | 'General' | null
}

export function MealList({
  meals,
  sessionStartDate,
  sessionEndDate,
  recipes,
  allItems,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
}: MealListProps) {
  const [recipeDialogState, setRecipeDialogState] = useState<DialogState>({
    isOpen: false,
    day: null,
    mealType: null
  })

  const [itemDialogState, setItemDialogState] = useState<DialogState>({
    isOpen: false,
    day: null,
    mealType: null
  })

  // General (non-dinner) meals are those not attached to a date or labeled "General"
  const generalMeals = meals.filter(
    (m) => !m.date || m.name?.toLowerCase() === 'general'
  )

  // Generate days for dinners
  const days = useMemo((): DayMeals[] => {
    if (!sessionStartDate || !sessionEndDate) return []

    const start = getAdjustedDateFromString(sessionStartDate)
    const end = getAdjustedDateFromString(sessionEndDate)

    const daysArray: DayMeals[] = []
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayMeals = meals.filter(m => m.date === dateStr)

      daysArray.push({
        date: dateStr,
        dateObj: new Date(current),
        dinner: dayMeals.find(m => m.name?.toLowerCase() === 'dinner') || null
      })

      current.setDate(current.getDate() + 1)
    }

    return daysArray
  }, [sessionStartDate, sessionEndDate, meals])

  const handleAddRecipe = async (recipeName: string) => {
    const { day, mealType } = recipeDialogState
    if (!mealType) return

    if (mealType === 'Dinner') {
      if (!day) return
      const meal = day.dinner
      const existingRecipes = meal?.meal_recipes?.map(mr => mr.recipe.name) || []
      const existingItems = meal?.meal_items?.map(mi => ({ name: mi.item.name, amount: mi.amount || '' })) || []

      if (meal) {
        await onUpdateMeal(meal.id, {
          name: 'Dinner',
          recipeNames: [...existingRecipes, recipeName],
          items: existingItems
        })
      } else {
        await onAddMeal(day.date, {
          name: 'Dinner',
          recipeNames: [recipeName],
          items: []
        })
      }
    } else {
      await onAddMeal(null, {
        name: 'General',
        recipeNames: [recipeName],
        items: []
      })
    }
  }

  const handleAddItem = async (itemName: string, amount: string) => {
    const { day, mealType } = itemDialogState
    if (!mealType) return

    if (mealType === 'Dinner') {
      if (!day) return
      const meal = day.dinner
      const existingRecipes = meal?.meal_recipes?.map(mr => mr.recipe.name) || []
      const existingItems = meal?.meal_items?.map(mi => ({ name: mi.item.name, amount: mi.amount || '' })) || []

      if (meal) {
        await onUpdateMeal(meal.id, {
          name: 'Dinner',
          recipeNames: existingRecipes,
          items: [...existingItems, { name: itemName, amount }]
        })
      } else {
        await onAddMeal(day.date, {
          name: 'Dinner',
          recipeNames: [],
          items: [{ name: itemName, amount }]
        })
      }
    } else {
      await onAddMeal(null, {
        name: 'General',
        recipeNames: [],
        items: [{ name: itemName, amount }]
      })
    }
  }

  const handleRemove = async (
    mealId: string,
    mealType: 'Dinner' | 'General',
    recipeNames: string[],
    items: { name: string; amount: string }[]
  ) => {
    // If removing the last recipe/item, delete the entire meal
    if (recipeNames.length === 0 && items.length === 0) {
      await onDeleteMeal(mealId)
    } else {
      await onUpdateMeal(mealId, {
        name: mealType,
        recipeNames,
        items
      })
    }
  }

  // Reusable delete button component
  function DeleteButton({ onClick }: { onClick: () => void }) {
    return (
      <ActionIcon
        size="sm"
        variant="subtle"
        color="red"
        onClick={onClick}
      >
        <IconTrash size={18} />
      </ActionIcon>
    )
  }

  // Reusable add recipe button
  function AddRecipeButton({ onClick }: { onClick: () => void }) {
    return (
      <Button
        leftSection={<IconPlus size={14} />}
        variant="light"
        size="xs"
        color="green"
        onClick={onClick}
      >
        Add recipe
      </Button>
    )
  }

  // Reusable add item button
  function AddItemButton({ onClick }: { onClick: () => void }) {
    return (
      <Button
        leftSection={<IconPlus size={14} />}
        variant="light"
        size="xs"
        color="blue"
        onClick={onClick}
      >
        Add item
      </Button>
    )
  }

  if (days.length === 0) {
    return (
      <Card withBorder shadow="sm" padding="lg">
        <Text c="dimmed" ta="center">No session dates available</Text>
      </Card>
    )
  }

  return (
    <div>
      <AddRecipeDialog
        opened={recipeDialogState.isOpen}
        onClose={() => setRecipeDialogState({ isOpen: false, day: null, mealType: null })}
        onSave={handleAddRecipe}
        recipes={recipes}
      />

      <AddItemDialog
        opened={itemDialogState.isOpen}
        onClose={() => setItemDialogState({ isOpen: false, day: null, mealType: null })}
        onSave={handleAddItem}
        allItems={allItems}
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          {/* Dinners Section */}
          <Card withBorder shadow="sm" padding="lg">
            <Title order={3}>Weekly Dinners</Title>
            <Stack gap="sm">
              {days.map((day) => {
                const meal = day.dinner
                const recipes = meal?.meal_recipes?.map(mr => mr.recipe.name) || []
                const items = meal?.meal_items?.map(mi => ({ name: mi.item.name, amount: mi.amount || '' })) || []

                return (
                  <Card key={day.date} withBorder padding="md">
                    <Stack gap="sm">
                      {/* Date Header */}
                      <div>
                        <Text size="md" fw={700}>
                          {day.dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                        </Text>
                        <Text size="md" c="dimmed">
                          {day.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </div>

                      {/* Recipes */}
                      {recipes.map((recipeName, idx) => (
                        <Group key={`recipe-${idx}`} gap="xs" wrap="nowrap" justify="space-between">
                          <Text size="md" fw={500}>
                            {recipeName}
                          </Text>
                          <DeleteButton onClick={() => handleRemove(
                            meal!.id,
                            'Dinner',
                            recipes.filter(r => r !== recipeName),
                            items
                          )} />
                        </Group>
                      ))}

                      {/* Items */}
                      {items.map((item, idx) => (
                        <Group key={`item-${idx}`} gap="xs" wrap="nowrap" justify="space-between">
                          <Text size="md" c="dimmed">
                            {item.name}{item.amount ? ` (${item.amount})` : ''}
                          </Text>
                          <DeleteButton onClick={() => handleRemove(
                            meal!.id,
                            'Dinner',
                            recipes,
                            items.filter(i => i.name !== item.name)
                          )} />
                        </Group>
                      ))}

                      {/* Add buttons */}
                      <Group gap="xs" mt="xs">
                        <AddRecipeButton onClick={() => setRecipeDialogState({ isOpen: true, day, mealType: 'Dinner' })} />
                        <AddItemButton onClick={() => setItemDialogState({ isOpen: true, day, mealType: 'Dinner' })} />
                      </Group>
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          {/* General Meals Section */}
          <Card withBorder shadow="sm" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Title order={4}>Breakfasts, Lunches & Other Meals</Title>
                <Group gap="xs">
                  <AddRecipeButton onClick={() => setRecipeDialogState({ isOpen: true, day: null, mealType: 'General' })} />
                  <AddItemButton onClick={() => setItemDialogState({ isOpen: true, day: null, mealType: 'General' })} />
                </Group>
              </Group>

              <Stack gap="xs">
                {generalMeals.length === 0 && (
                  <Text size="md" c="dimmed">
                    No general meals added yet.
                  </Text>
                )}
                {generalMeals.map((meal) => {
                  const recipes = meal.meal_recipes?.map(mr => mr.recipe.name) || []
                  const items = meal.meal_items?.map(mi => ({ name: mi.item.name, amount: mi.amount || '' })) || []

                  return (
                    <Paper key={meal.id} withBorder p="sm">
                      <Stack gap="xs">
                        {recipes.map((recipeName, idx) => (
                          <Group key={`gr-${idx}`} justify="space-between">
                            <Text size="md">{recipeName}</Text>
                            <DeleteButton onClick={() => handleRemove(
                              meal.id,
                              'General',
                              recipes.filter(r => r !== recipeName),
                              items
                            )} />
                          </Group>
                        ))}
                        {items.map((item, idx) => (
                          <Group key={`gi-${idx}`} justify="space-between">
                            <Text size="md" c="dimmed">
                              {item.name}{item.amount ? ` (${item.amount})` : ''}
                            </Text>
                            <DeleteButton onClick={() => handleRemove(
                              meal.id,
                              'General',
                              recipes,
                              items.filter(i => i.name !== item.name)
                            )} />
                          </Group>
                        ))}
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  )
}

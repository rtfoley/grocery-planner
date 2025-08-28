// src/Components/MealPlanner.tsx
'use client'

import { useState, useMemo } from 'react'
import { Title, Group, Button, Select, Grid, Card, Text, Stack } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { Recipe, MealAssignment } from '@/lib/types'
import { ShoppingList } from './ShoppingList'
import { StaplesSelector } from './StaplesSelector'

interface MealPlannerProps {
  recipes: Recipe[]
  staples: Array<{ id: number, name: string, staple_amount: string | null }>
  allItems: Array<{ name: string, store_order_index: number | null }>
}

export function MealPlanner({ recipes, staples, allItems }: MealPlannerProps) {
  // State management
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [mealAssignments, setMealAssignments] = useState<MealAssignment[]>([])
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set())
  const [adHocItems, setAdHocItems] = useState<Array<{ item: string, amount?: string }>>([])
  const [stapleSelections, setStapleSelections] = useState<Map<number, 'pending' | 'included' | 'excluded'>>(new Map())

  // Generate 14 consecutive days from start date
  const planningDays = useMemo(() => {
    if (!startDate) return []
    
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + index)
      return date
    })
  }, [startDate])

  // Initialize meal assignments when start date changes
  useMemo(() => {
    if (planningDays.length > 0) {
      setMealAssignments(planningDays.map(date => ({ date, recipeId: null })))
    }
  }, [planningDays])

  // Recipe options for select dropdown
  const recipeOptions = [
    { value: '', label: 'Select recipe...' },
    ...recipes.map(recipe => ({
      value: recipe.id.toString(),
      label: recipe.name.length > 40 ? `${recipe.name.substring(0, 37)}...` : recipe.name
    }))
  ]

  // Event handlers
  const handleRecipeChange = (dateIndex: number, recipeId: string) => {
    setMealAssignments(prev => 
      prev.map((assignment, index) => 
        index === dateIndex 
          ? { ...assignment, recipeId: recipeId ? parseInt(recipeId) : null }
          : assignment
      )
    )
  }

  const startNewSession = () => {
    setStartDate(new Date())
    setMealAssignments([])
    setExcludedItems(new Set())
    setAdHocItems([])
    setStapleSelections(new Map())
  }

  const toggleItemExclusion = (itemName: string) => {
    setExcludedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  const addAdHocItem = (item: string, amount?: string) => {
    setAdHocItems(prev => [...prev, { item: item.toLowerCase().trim(), amount }])
  }

  const removeAdHocItem = (index: number) => {
    setAdHocItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleStapleSelection = (stapleId: number, status: 'pending' | 'included' | 'excluded') => {
    setStapleSelections(prev => {
      const newMap = new Map(prev)
      newMap.set(stapleId, status)
      return newMap
    })
  }

  // Get selected recipes for shopping list
  const selectedRecipes = mealAssignments
    .filter(assignment => assignment.recipeId)
    .map(assignment => recipes.find(r => r.id === assignment.recipeId)!)
    .filter(Boolean)

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Meal Planning</Title>
          {startDate && (
            <Text c="dimmed">
              {startDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric' 
              })} - {planningDays[13]?.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          )}
        </div>
        <Group align="flex-end">
          <DatePickerInput
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            leftSection={<IconCalendar size={16} />}
            clearable={false}
            placeholder="Pick start date"
            valueFormat="MMM D, YYYY"
          />
          <Button variant="light" onClick={startNewSession}>
            New Session
          </Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card>
            <Title order={3} mb="md">Planning Session</Title>
            <Stack gap="sm">
              {planningDays.map((date, index) => {
                const assignment = mealAssignments[index]
                return (
                  <Group key={index} justify="space-between">
                    <Text w={80} size="sm">
                      {date.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'numeric',
                        day: 'numeric'
                      })}
                    </Text>
                    <Select
                      placeholder="Select recipe..."
                      data={recipeOptions}
                      value={assignment?.recipeId?.toString() || ''}
                      onChange={(value) => handleRecipeChange(index, value || '')}
                      style={{ flex: 1 }}
                      clearable
                      size="sm"
                    />
                  </Group>
                )
              })}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <StaplesSelector
            staples={staples}
            stapleSelections={stapleSelections}
            onStapleSelection={handleStapleSelection}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <ShoppingList 
            recipes={selectedRecipes} 
            excludedItems={excludedItems}
            onToggleExclusion={toggleItemExclusion}
            adHocItems={adHocItems}
            onAddAdHocItem={addAdHocItem}
            onRemoveAdHocItem={removeAdHocItem}
            staples={staples}
            stapleSelections={stapleSelections}
            allItems={allItems}
          />
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
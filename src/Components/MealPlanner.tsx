// src/Components/MealPlanner.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Title, Group, Button, Grid, Text, Stack } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { MealAssignmentWithRecipe, RecipeWithItems } from '@/lib/types'
import { ShoppingList } from './ShoppingList'
import { StaplesSelector } from './StaplesSelector'
import { createMealAssignment, createPlanningSession, getActivePlanningSession, getMealAssignments, updateMealAssignment } from '@/lib/actions'
import { MealList } from './MealList'

interface MealPlannerProps {
  recipes: RecipeWithItems[]
  staples: Array<{ id: number, name: string, staple_amount: string | null }>
  allItems: Array<{ name: string, store_order_index: number | null }>
}

export function MealPlanner({ recipes, staples, allItems }: MealPlannerProps) {
  // State management
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set())
  const [adHocItems, setAdHocItems] = useState<Array<{ item: string, amount?: string }>>([])
  const [stapleSelections, setStapleSelections] = useState<Map<number, 'pending' | 'included' | 'excluded'>>(new Map())

  const [planningSessionId, setPlanningSessionId] = useState<number | null>();
  const [mealAssignments, setMealAssignments] = useState<MealAssignmentWithRecipe[]>([]);

  useEffect(() => {
    async function fetchData() {
      const planningSession = await getActivePlanningSession();
      if(!planningSession)
      {
        return;
      }

      const assignments = await getMealAssignments(planningSession?.id);
      setPlanningSessionId(planningSession.id);
      setMealAssignments(assignments);
    }
    
    fetchData();
  }, [])

  const startNewSession = async () => {
    if(!startDate)
    {
      return;
    }

    const planningSession = await createPlanningSession(startDate);
    setPlanningSessionId(planningSession.id);
    console.log(startDate);

    const tempMealAssignments: MealAssignmentWithRecipe[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate); // Copy the full date
      date.setDate(startDate.getDate() + i); // Add days to original day
      const assignment: MealAssignmentWithRecipe = await createMealAssignment(planningSession.id, null, date);
      tempMealAssignments.push(assignment);
    }

    console.log(tempMealAssignments);
    setMealAssignments(tempMealAssignments);
  };

  const endDate = useMemo(() => {
    if (!startDate)
    {
      return new Date();
    }

    const date = new Date(startDate);
    date.setDate(startDate.getDate() + 14);
    return date;
  }, [startDate])

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

  const handleRecipeChange = async (assignment: MealAssignmentWithRecipe, recipeId: number | null) =>
  {
    setMealAssignments(prev => 
      prev.map(existingAssignment => 
        existingAssignment.date.getTime() === assignment.date.getTime()
          ? { ...existingAssignment, recipe_id: recipeId }
          : existingAssignment
      )
    );

    await updateMealAssignment(assignment.planning_session_id, recipeId, assignment.date);
  }

  const selectedRecipes = mealAssignments
    .filter(assignment => assignment.recipe_id)
    .map(assignment => recipes.find(r => r.id === assignment.recipe_id)!)
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
              })} - {endDate.toLocaleDateString('en-US', { 
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
            onChange={(value: Date | null) => setStartDate(value)}
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
          <MealList mealAssignments={mealAssignments} recipes={recipes} onRecipeChange={handleRecipeChange}/>
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
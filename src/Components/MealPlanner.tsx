// src/Components/MealPlanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { Title, Group, Button, Grid, Text, Stack, Modal, Loader, Center, Paper, Select } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar, IconShoppingCart } from '@tabler/icons-react'
import Link from 'next/link'
import { AdhocItemWithItem, ItemExclusionWithItem, MealWithDetails, RecipeWithItems, StapleSelectionWithItem, Item, StapleStatus, StapleStatusEnum } from '@/lib/types'
import { ShoppingList } from './ShoppingList'
import { StaplesSelector } from './StaplesSelector'
import { addItemExclusion, createAdhocItem, createMeal, createPlanningSession, createStapleSelection, deleteAdhocItem, deleteItemExclusion, deleteMeal, getAdhocItems, getItemExclusions, getMeals, getPlanningSession, getPlanningSessions, getStapleSelections, updateAdhocItem, updateStapleSelection, addRecipeToMeal, addItemToMeal, removeRecipeFromMeal, removeMealItem, updateMeal } from '@/lib/actions'
import { MealList } from './MealList'
import { MealDialogData } from './MealDialog'
import { useDisclosure } from '@mantine/hooks'
import { getAdjustedDateFromString } from '@/lib/utilities'
import { showSuccess, showError } from '@/lib/notifications'

interface MealPlannerProps {
  recipes: RecipeWithItems[]
  allItems: Item[]
}

export function MealPlanner({ recipes, allItems }: MealPlannerProps) {
  // State management
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [planningSessionId, setPlanningSessionId] = useState<string | undefined>();
  const [currentSession, setCurrentSession] = useState<{id: string, start_date: string, end_date: string} | null>(null);
  const [allSessions, setAllSessions] = useState<Array<{id: string, start_date: string, end_date: string}>>([]);
  const [meals, setMeals] = useState<MealWithDetails[]>([]);
  const [stapleSelections, setStapleSelections] = useState<StapleSelectionWithItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<ItemExclusionWithItem[]>([]);
  const [adHocItems, setAdHocItems] = useState<AdhocItemWithItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Load all sessions
        const sessions = await getPlanningSessions();
        setAllSessions(sessions);

        if (sessions.length === 0) {
          setIsLoading(false);
          return;
        }

        // Find the active session (includes today or next upcoming)
        const today = new Date().toISOString().split('T')[0];
        const activeSession = sessions
          .filter(s => s.end_date >= today)
          .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

        if (activeSession) {
          await loadSession(activeSession.id);
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData();
  }, [])

  const loadSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const planningSession = await getPlanningSession(sessionId);
      if (!planningSession) return;

      setPlanningSessionId(planningSession.id);
      setCurrentSession(planningSession);

      const mealsData = await getMeals(planningSession.id);
      setMeals(mealsData);

      // TODO check for staples that have been added that don't yet have selection records
      const staples = await getStapleSelections(planningSession.id);
      setStapleSelections(staples);

      const itemExclusions = await getItemExclusions(planningSession.id);
      setExcludedItems(itemExclusions);

      const additionalItems = await getAdhocItems(planningSession.id);
      setAdHocItems(additionalItems);
    } finally {
      setIsLoading(false);
    }
  }

  const startNewSession = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return;
    }

    setIsCreatingSession(true)
    try {
      const start = new Date(dateRange[0]);
      const end = new Date(dateRange[1]);

      const result = await createPlanningSession(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      if (!result.success || !result.session) {
        console.error('Failed to create planning session:', result.error);
        showError(result.error || 'Failed to create planning session');
        return;
      }

      setPlanningSessionId(result.session.id);
      setCurrentSession(result.session);

      // No pre-created meals - user adds them as needed
      setMeals([]);

      // Create staple selections
      const tempStapleSelections: StapleSelectionWithItem[] = [];
      for (const item of allItems) {
        if (item.is_staple) {
          const stapleSelection = await createStapleSelection(result.session.id, item.id, StapleStatusEnum.PENDING);
          if (stapleSelection) {
            tempStapleSelections.push(stapleSelection);
          }
        }
      }

      setStapleSelections(tempStapleSelections);
      setExcludedItems([]);
      setDateRange([null, null]);

      // Refresh sessions list
      const sessions = await getPlanningSessions();
      setAllSessions(sessions);

      showSuccess('Planning session created successfully');

      close();
    } finally {
      setIsCreatingSession(false)
    }
  };

  const excludeItem = async (itemId: string) => {
    if(planningSessionId === null)
    {
      return;
    }

    const itemExclusion = await addItemExclusion(planningSessionId!, itemId);
    if (itemExclusion) {
      setExcludedItems(prev => [...prev, itemExclusion]);
    }
  }

  const unexcludeItem = async (itemExclusion: ItemExclusionWithItem) => {
    setExcludedItems(prev => prev.filter(item => item.item_id !== itemExclusion.item_id));
    await deleteItemExclusion(planningSessionId!, itemExclusion.item_id);
  }

  const addAdHocItem = async (itemName: string, amount: string) => {
    try {
      const newItem = await createAdhocItem(planningSessionId!, itemName, amount)
      if (newItem) {
        setAdHocItems(prev => [...prev, newItem])
        showSuccess('Item added to shopping list');
      }
    } catch {
      showError('Failed to add item');
    }
  }

  const updateAddhocItemAmount = async (updatedItem: AdhocItemWithItem) => {
    setAdHocItems(prev => 
      prev.map(item =>
        item.item_id === updatedItem.item_id
          ? {...item, amount: updatedItem.amount}
          : item
      )
    );

    await updateAdhocItem(updatedItem.planning_session_id, updatedItem.item_id, updatedItem.amount);
  }

  const removeAdHocItem = async (removedItem: AdhocItemWithItem) => {
    setAdHocItems(prev => prev.filter((item) => item.item_id !== removedItem.item_id));

    await deleteAdhocItem(removedItem.planning_session_id, removedItem.item_id);
  }

  const handleStapleSelection = async (stapleSelection: StapleSelectionWithItem, newStatus: StapleStatus) => {
    setStapleSelections(prev =>
      prev.map(selection =>
        selection.item_id === stapleSelection.item_id
          ? { ...selection, status: newStatus }
          : selection
      )
    );

    // Persist to DB
    await updateStapleSelection(stapleSelection.planning_session_id!, stapleSelection.item_id, newStatus);
  }

  const handleAddMeal = async (date: string | null, mealData: MealDialogData) => {
    if (!planningSessionId) return;

    try {
      // Create the meal
      const newMeal = await createMeal(planningSessionId, date, mealData.name);
      if (!newMeal) {
        showError('Failed to create meal');
        return;
      }

      // Add recipes to meal
      for (const recipeName of mealData.recipeNames) {
        const recipe = recipes.find(r => r.name === recipeName);
        if (recipe) {
          await addRecipeToMeal(newMeal.id, recipe.id);
        }
      }

      // Add items to meal
      for (const item of mealData.items) {
        const foundItem = allItems.find(i => i.name === item.name);
        if (foundItem) {
          await addItemToMeal(newMeal.id, foundItem.id, item.amount || null);
        }
      }

      // Reload meals to get complete data
      const updatedMeals = await getMeals(planningSessionId);
      setMeals(updatedMeals);
    } catch {
      showError('Failed to add meal');
    }
  }

  const updateMealRecipes = async (mealId: string, existingMeal: MealWithDetails, newRecipeNames: string[]) => {
    const existingRecipeNames = existingMeal.meal_recipes?.map(mr => mr.recipe.name) || [];

    // Remove recipes no longer in the meal
    for (const mr of existingMeal.meal_recipes || []) {
      if (!newRecipeNames.includes(mr.recipe.name)) {
        await removeRecipeFromMeal(mr.id);
      }
    }

    // Add new recipes
    for (const recipeName of newRecipeNames) {
      if (!existingRecipeNames.includes(recipeName)) {
        const recipe = recipes.find(r => r.name === recipeName);
        if (recipe) {
          await addRecipeToMeal(mealId, recipe.id);
        }
      }
    }
  }

  const updateMealItems = async (mealId: string, existingMeal: MealWithDetails, newItems: Array<{ name: string; amount: string }>) => {
    // Remove items no longer in the meal
    for (const mi of existingMeal.meal_items || []) {
      if (!newItems.some(item => item.name === mi.item.name)) {
        await removeMealItem(mi.id);
      }
    }

    // Add new items (note: not updating amounts for existing items)
    for (const item of newItems) {
      const existingMealItem = existingMeal.meal_items?.find(mi => mi.item.name === item.name);
      if (!existingMealItem) {
        const foundItem = allItems.find(i => i.name === item.name);
        if (foundItem) {
          await addItemToMeal(mealId, foundItem.id, item.amount || null);
        }
      }
    }
  }

  const handleUpdateMeal = async (mealId: string, mealData: MealDialogData) => {
    if (!planningSessionId) return;

    const existingMeal = meals.find(m => m.id === mealId);
    if (!existingMeal) return;

    try {
      // Update meal name if changed
      if (mealData.name !== (existingMeal.name || '')) {
        await updateMeal(mealId, { name: mealData.name });
      }

      // Update recipes and items
      await updateMealRecipes(mealId, existingMeal, mealData.recipeNames);
      await updateMealItems(mealId, existingMeal, mealData.items);

      // Reload meals to get complete data
      const updatedMeals = await getMeals(planningSessionId);
      setMeals(updatedMeals);
    } catch {
      showError('Failed to update meal');
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    try {
      setMeals(prev => prev.filter(m => m.id !== mealId));
      await deleteMeal(mealId);
    } catch {
      showError('Failed to delete meal');
      // Reload meals to restore state on error
      if (planningSessionId) {
        const updatedMeals = await getMeals(planningSessionId);
        setMeals(updatedMeals);
      }
    }
  }

  // Extract selected recipes from meals for shopping list
  const selectedRecipes = meals
    .flatMap(meal => meal.meal_recipes?.map(mr => mr.recipe) || [])
    .filter(Boolean)

  const openModal = () => {
    setDateRange([null, null]);
    open();
  }


  return (
    <Stack gap="xl">
      <Modal opened={opened} onClose={close} title="New Session" centered
        closeOnEscape={false}
        closeOnClickOutside={false}
        size="md">
        <Stack gap="lg">
          <DatePickerInput
            type="range"
            label="Pick dates range"
            placeholder="Select start and end dates"
            value={dateRange}
            onChange={(value) => setDateRange(value as [Date | null, Date | null])}
            leftSection={<IconCalendar size={16} />}
            clearable={false}
            required
            excludeDate={(date) => {
              const input = new Date(date);
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);
              return input < yesterday;
            }}
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              onClick={startNewSession}
              disabled={!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1]}
              loading={isCreatingSession}
            >
              Create Session
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Meal Planning</Title>
        </div>
        <Group align="flex-end" gap="sm">
          {allSessions.length > 0 && (
            <Select
              placeholder="Select session"
              value={planningSessionId || null}
              onChange={(value) => value && loadSession(value)}
              data={allSessions
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                .map((session) => ({
                  value: session.id,
                  label: `${getAdjustedDateFromString(session.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })} - ${getAdjustedDateFromString(session.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}`,
                }))
              }
              style={{ width: 200 }}
              disabled={isLoading}
            />
          )}
          {planningSessionId && (
            <Button
              component={Link}
              href={`/shopping?session=${planningSessionId}`}
              leftSection={<IconShoppingCart size={16} />}
              disabled={isLoading}
            >
              Go Shopping
            </Button>
          )}
          <Button variant="light" onClick={openModal} disabled={isLoading}>
            New Session
          </Button>
        </Group>
      </Group>

      {isLoading ? (
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      ) : !planningSessionId ? (
        <Center h={300}>
          <Paper p="xl" withBorder>
            <Stack align="center" gap="md">
              <Text size="lg" fw={500}>No Active Planning Session</Text>
              <Text c="dimmed" ta="center">
                Create a new planning session to start planning your meals
              </Text>
              <Button onClick={openModal}>
                Create Session
              </Button>
            </Stack>
          </Paper>
        </Center>
      ) : (
        <Stack gap="xl">
          {/* Meal List - Full Width - Unified view for all screen sizes */}
          <MealList
            meals={meals}
            sessionStartDate={currentSession?.start_date || null}
            sessionEndDate={currentSession?.end_date || null}
            recipes={recipes}
            allItems={allItems}
            onAddMeal={handleAddMeal}
            onUpdateMeal={handleUpdateMeal}
            onDeleteMeal={handleDeleteMeal}
          />

          {/* Staples and Shopping List - Side by Side */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <StaplesSelector
                stapleSelections={stapleSelections}
                onStapleSelection={handleStapleSelection}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <ShoppingList
                recipes={selectedRecipes}
                excludedItems={excludedItems}
                onExcludeItem={excludeItem}
                onUnexcludeItem={unexcludeItem}
                adHocItems={adHocItems}
                onAddAdHocItem={addAdHocItem}
                onUpdateAdhocItem={updateAddhocItemAmount}
                onRemoveAdHocItem={removeAdHocItem}
                meals={meals}
                stapleSelections={stapleSelections}
                allItems={allItems}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </Stack>
  )
}
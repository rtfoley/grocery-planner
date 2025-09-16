// src/Components/MealPlanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { Title, Group, Button, Grid, Text, Stack, Modal } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { AdhocItemWithItem, ItemExclusionWithItem, MealAssignmentWithRecipe, RecipeWithItems, StapleSelectionWithItem } from '@/lib/types'
import { ShoppingList } from './ShoppingList'
import { StaplesSelector } from './StaplesSelector'
import { addItemExclusion, createAdhocItem, createMealAssignment, createPlanningSession, createStapleSelection, deleteAdhocItem, deleteItemExclusion, getActivePlanningSession, getAdhocItems, getItemExclusions, getMealAssignments, getStapleSelections, updateAdhocItem, updateMealAssignment, updateStapleSelection } from '@/lib/actions'
import { MealList } from './MealList'
import { Item, StapleStatus } from '@prisma/client'
import { useDisclosure } from '@mantine/hooks'

interface MealPlannerProps {
  recipes: RecipeWithItems[]
  allItems: Item[]
}

export function MealPlanner({ recipes, allItems }: MealPlannerProps) {
  // State management
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const [startDate, setStartDate] = useState<Date | null>();
  const [endDate, setEndDate] = useState<Date | null>();
  const [planningSessionId, setPlanningSessionId] = useState<number | undefined>();
  const [mealAssignments, setMealAssignments] = useState<MealAssignmentWithRecipe[]>([]);
  const [stapleSelections, setStapleSelections] = useState<StapleSelectionWithItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<ItemExclusionWithItem[]>([]);
  const [adHocItems, setAdHocItems] = useState<AdhocItemWithItem[]>([])

  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    async function fetchData() {
      const planningSession = await getActivePlanningSession();
      if(!planningSession)
      {
        return;
      }

      setPlanningSessionId(planningSession.id);

      const assignments = await getMealAssignments(planningSession?.id);
      setMealAssignments(assignments);

      // TODO check for staples that have been added that don't yet have selection records
      const staples = await getStapleSelections(planningSession.id);
      setStapleSelections(staples);

      const itemExclusions = await getItemExclusions(planningSession.id);
      setExcludedItems(itemExclusions);

      const additionalItems = await getAdhocItems(planningSession.id);
      setAdHocItems(additionalItems);
    }
    
    fetchData();
  }, [])

  const getDaysBetween = (start: Date, end: Date): number => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.ceil((end.getTime() - start.getTime()) / oneDay) + 1; // +1 to include both dates
  };

  const startNewSession = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return;
    }

    const start = new Date(dateRange[0] + 'T00:00:00');
    const end = new Date(dateRange[1] + 'T00:00:00');
    console.log(`Creating session from ${start} - ${end}`);

    const dayCount = getDaysBetween(start, end);

    //// TODO add loading spinner
    const planningSession = await createPlanningSession(start);
    setPlanningSessionId(planningSession.id);

    const tempMealAssignments: MealAssignmentWithRecipe[] = [];
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start.getTime() + (i * 24 * 60 * 60 * 1000));
      console.log(`Adding meal slot for ${date}, ${start} + ${i} days`);
      const assignment: MealAssignmentWithRecipe = await createMealAssignment(planningSession.id, null, date);
      tempMealAssignments.push(assignment);
    }

    setMealAssignments(tempMealAssignments);

    const tempStapleSelections: StapleSelectionWithItem[] = [];
    for (const item of allItems) {
      if (item.is_staple) {
        const stapleSelection = await createStapleSelection(planningSession.id, item.id, StapleStatus.PENDING);
        tempStapleSelections.push(stapleSelection);
      }
    }

    setStapleSelections(tempStapleSelections);
    setExcludedItems([]);

    setStartDate(start);
    setEndDate(end);
    setDateRange([null, null]);
    close();
  };

  const excludeItem = async (itemId: number) => {
    if(planningSessionId === null)
    {
      return;
    }

    const itemExclusion = await addItemExclusion(planningSessionId!, itemId);

    setExcludedItems(prev => [...prev, itemExclusion]);
  }

  const unexcludeItem = async (itemExclusion: ItemExclusionWithItem) => {
    setExcludedItems(prev => prev.filter(item => item.item_id !== itemExclusion.item_id));
    await deleteItemExclusion(planningSessionId!, itemExclusion.item_id);
  }

  const addAdHocItem = async (itemName: string, amount: string) => {
    const newItem = await createAdhocItem(planningSessionId!, itemName, amount)

    setAdHocItems(prev => [...prev, newItem])
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
            onChange={(value) => {
              console.log('DatePicker onChange:', value);
              setDateRange(value);
            }}
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
            >
              Create Session
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Meal Planning</Title>
          {startDate && endDate && (
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
          <Button variant="light" onClick={openModal}>
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
            stapleSelections={stapleSelections}
            onStapleSelection={handleStapleSelection}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <ShoppingList 
            recipes={selectedRecipes} 
            excludedItems={excludedItems}
            onExcludeItem={excludeItem}
            onUnexcludeItem={unexcludeItem}
            adHocItems={adHocItems}
            onAddAdHocItem={addAdHocItem}
            onUpdateAdhocItem={updateAddhocItemAmount}
            onRemoveAdHocItem={removeAdHocItem}
            stapleSelections={stapleSelections}
            allItems={allItems}
          />
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
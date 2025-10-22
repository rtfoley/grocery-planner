// src/Components/MealPlanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { Title, Group, Button, Grid, Text, Stack, Modal, Loader, Center } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { AdhocItemWithItem, ItemExclusionWithItem, MealAssignmentWithRecipe, RecipeWithItems, StapleSelectionWithItem, Item, StapleStatus, StapleStatusEnum } from '@/lib/types'
import { ShoppingList } from './ShoppingList'
import { StaplesSelector } from './StaplesSelector'
import { addItemExclusion, createAdhocItem, createMealAssignment, createPlanningSession, createStapleSelection, deleteAdhocItem, deleteItemExclusion, getActivePlanningSession, getAdhocItems, getItemExclusions, getMealAssignments, getStapleSelections, updateAdhocItem, updateMealAssignment, updateStapleSelection } from '@/lib/actions'
import { MealList } from './MealList'
import { useDisclosure } from '@mantine/hooks'

interface MealPlannerProps {
  recipes: RecipeWithItems[]
  allItems: Item[]
}

export function MealPlanner({ recipes, allItems }: MealPlannerProps) {
  // State management
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, setStartDate] = useState<Date | null>();
  const [endDate, setEndDate] = useState<Date | null>();
  const [planningSessionId, setPlanningSessionId] = useState<string | undefined>();
  const [mealAssignments, setMealAssignments] = useState<MealAssignmentWithRecipe[]>([]);
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
      } finally {
        setIsLoading(false)
      }
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

    setIsCreatingSession(true)
    try {
      const start = new Date(dateRange[0]);
      const end = new Date(dateRange[1]);
      console.log(`Creating session from ${start} - ${end}`);

      const dayCount = getDaysBetween(start, end);

      const planningSession = await createPlanningSession(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
    if (!planningSession) return;

    setPlanningSessionId(planningSession.id);

    const tempMealAssignments: MealAssignmentWithRecipe[] = [];
    for (let i = 0; i < dayCount; i++) {
      console.log(start);
      const date = new Date(start.getTime() + (i * 24 * 60 * 60 * 1000));
      console.log(`Adding meal slot for ${date}, ${start} + ${i} days`);
      const assignment = await createMealAssignment(
        planningSession.id,
        null,
        date.toISOString().split('T')[0]
      );
      if (assignment) {
        tempMealAssignments.push(assignment);
      }
    }

    setMealAssignments(tempMealAssignments);

    const tempStapleSelections: StapleSelectionWithItem[] = [];
    for (const item of allItems) {
      if (item.is_staple) {
        const stapleSelection = await createStapleSelection(planningSession.id, item.id, StapleStatusEnum.PENDING);
        if (stapleSelection) {
          tempStapleSelections.push(stapleSelection);
        }
      }
    }

      setStapleSelections(tempStapleSelections);
      setExcludedItems([]);

      setStartDate(start);
      setEndDate(end);
      setDateRange([null, null]);
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
    const newItem = await createAdhocItem(planningSessionId!, itemName, amount)
    if (newItem) {
      setAdHocItems(prev => [...prev, newItem])
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

  const handleRecipeChange = async (assignment: MealAssignmentWithRecipe, recipeId: string | null) =>
  {
    setMealAssignments(prev =>
      prev.map(existingAssignment =>
        existingAssignment.date === assignment.date
          ? { ...existingAssignment, recipe_id: recipeId }
          : existingAssignment
      )
    );

    await updateMealAssignment(assignment.id, recipeId);
  }

  const selectedRecipes = mealAssignments
    .filter(assignment => assignment.recipe_id)
    .map(assignment => recipes.find(r => r.id === assignment.recipe_id)!)
    .filter(Boolean)

  const openModal = () => {
    setDateRange([null, null]);
    open();
  }

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
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
            onChange={setDateRange}
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
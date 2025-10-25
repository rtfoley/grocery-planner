import { MealAssignmentWithRecipe, MealSideItemWithItem, Recipe, Item } from "@/lib/types";
import { getAdjustedDateFromString } from "@/lib/utilities";
import { Card, Title, Stack, Group, Select, Text, ActionIcon, TextInput, Button } from "@mantine/core";
import { IconPlus, IconTrash, IconCheck } from "@tabler/icons-react";
import { ItemAutocomplete } from "./ItemAutocomplete";
import { useState } from "react";

interface MealListProps {
  mealAssignments: MealAssignmentWithRecipe[]
  mealSideItems: MealSideItemWithItem[]
  recipes: Recipe[];
  allItems: Item[];
  onRecipeChange: (mealAssignment: MealAssignmentWithRecipe, recipeId: string | null) => void
  onAddMeal: (date: string | null) => void
  onRemoveMeal: (assignmentId: string) => void
  onAddSideItem: (date: string | null, itemId: string, amount: string) => void
  onRemoveSideItem: (sideItemId: string) => void
}

export function MealList({ mealAssignments, mealSideItems, recipes, allItems, onRecipeChange, onAddMeal, onRemoveMeal, onAddSideItem, onRemoveSideItem }: MealListProps) {
  const [addingSideForDate, setAddingSideForDate] = useState<string | null>(null);
  const [sideItemName, setSideItemName] = useState('');
  const [sideItemAmount, setSideItemAmount] = useState('');
  const recipeOptions = [
    { value: "", label: "Select recipe..." },
    ...recipes.map((recipe) => ({
      value: recipe.id,
      label:
        recipe.name.length > 40
          ? `${recipe.name.substring(0, 37)}...`
          : recipe.name,
    })),
  ];

  const handleRecipeChange = (assignment: MealAssignmentWithRecipe, recipeId: string | null) => {
    onRecipeChange(assignment, recipeId)
  };

  const handleAddSideClick = (date: string) => {
    setAddingSideForDate(date);
    setSideItemName('');
    setSideItemAmount('');
  };

  const handleSaveSideItem = (date: string) => {
    if (!sideItemName.trim()) return;

    const item = allItems.find(i => i.name === sideItemName.toLowerCase().trim());
    if (!item) return;

    const actualDate = date === 'undated' ? null : date;
    onAddSideItem(actualDate, item.id, sideItemAmount.trim());
    setAddingSideForDate(null);
  };

  const handleCancelSideItem = () => {
    setAddingSideForDate(null);
    setSideItemName('');
    setSideItemAmount('');
  };

  // Group assignments by date
  const assignmentsByDate = mealAssignments.reduce((acc, assignment) => {
    const date = assignment.date || 'undated';
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, MealAssignmentWithRecipe[]>);

  // Ensure 'undated' always exists (even if empty)
  if (!assignmentsByDate['undated']) {
    assignmentsByDate['undated'] = [];
  }

  // Group side items by date
  const sideItemsByDate = mealSideItems.reduce((acc, sideItem) => {
    const date = sideItem.date || 'undated';
    if (!acc[date]) acc[date] = [];
    acc[date].push(sideItem);
    return acc;
  }, {} as Record<string, MealSideItemWithItem[]>);

  // Sort dates
  const sortedDates = Object.keys(assignmentsByDate).sort((a, b) => {
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    return getAdjustedDateFromString(a).getTime() - getAdjustedDateFromString(b).getTime();
  });

  return (
    <Card>
      <Stack gap="md">
        <Title order={3}>Meals</Title>
        {sortedDates.map((date) => {
          const assignments = assignmentsByDate[date];
          const dateStr = date === 'undated'
            ? 'Additional Meals'
            : getAdjustedDateFromString(date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "numeric",
                day: "numeric",
              });

          const dateSideItems = sideItemsByDate[date] || [];

          return (
            <Card key={date} withBorder padding="sm" style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={600} c={date === 'undated' ? 'dimmed' : undefined}>
                    {dateStr}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => onAddMeal(date === 'undated' ? null : date)}
                    aria-label="Add meal"
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Group>

                {/* Meal assignments */}
                {assignments.map((assignment) => (
                  <Group key={assignment.id} gap="xs">
                    <Select
                      placeholder="Select recipe..."
                      data={recipeOptions}
                      value={assignment?.recipe_id || ""}
                      onChange={(value) => handleRecipeChange(assignment, value || null)}
                      style={{ flex: 1 }}
                      clearable
                      size="sm"
                    />
                    {assignments.length > 1 && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => onRemoveMeal(assignment.id)}
                        aria-label="Remove meal"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}

                {/* Side items */}
                {dateSideItems.map((sideItem) => (
                  <Group key={sideItem.id} gap="xs">
                    <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                      Side: {sideItem.item.name}{sideItem.amount ? `: ${sideItem.amount}` : ''}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => onRemoveSideItem(sideItem.id)}
                      aria-label="Remove side item"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}

                {/* Add side item inline UI */}
                {addingSideForDate === date ? (
                  <Group gap="xs" align="flex-end">
                    <ItemAutocomplete
                      placeholder="Side item..."
                      value={sideItemName}
                      onChange={setSideItemName}
                      size="xs"
                      style={{ flex: 2 }}
                    />
                    <TextInput
                      placeholder="Amount"
                      value={sideItemAmount}
                      onChange={(e) => setSideItemAmount(e.target.value)}
                      size="xs"
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      variant="filled"
                      color="green"
                      size="sm"
                      onClick={() => handleSaveSideItem(date)}
                      disabled={!sideItemName.trim()}
                    >
                      <IconCheck size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={handleCancelSideItem}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ) : (
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => handleAddSideClick(date)}
                  >
                    Add Side
                  </Button>
                )}
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Card>
  );
}

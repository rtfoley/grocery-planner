import { MealAssignmentWithRecipe, Recipe } from "@/lib/types";
import { getAdjustedDateFromString } from "@/lib/utilities";
import { Card, Title, Stack, Group, Select, Text, ActionIcon, Button } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

interface MealListProps {
  mealAssignments: MealAssignmentWithRecipe[]
  recipes: Recipe[];
  onRecipeChange: (mealAssignment: MealAssignmentWithRecipe, recipeId: string | null) => void
  onAddMeal: (date: string | null) => void
  onRemoveMeal: (assignmentId: string) => void
}

export function MealList({ mealAssignments, recipes, onRecipeChange, onAddMeal, onRemoveMeal }: MealListProps) {
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

  // Group assignments by date
  const assignmentsByDate = mealAssignments.reduce((acc, assignment) => {
    const date = assignment.date || 'undated';
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, MealAssignmentWithRecipe[]>);

  // Sort dates
  const sortedDates = Object.keys(assignmentsByDate).sort((a, b) => {
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    return getAdjustedDateFromString(a).getTime() - getAdjustedDateFromString(b).getTime();
  });

  return (
    <Card>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>Meals</Title>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={() => onAddMeal(null)}
          >
            Add Undated
          </Button>
        </Group>
        {sortedDates.map((date) => {
          const assignments = assignmentsByDate[date];
          const dateStr = date === 'undated'
            ? 'Undated Meals'
            : getAdjustedDateFromString(date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "numeric",
                day: "numeric",
              });

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
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Card>
  );
}

import { getMealAssignments, updateMealAssignment } from "@/lib/actions";
import { MealAssignmentWithRecipe, Recipe } from "@/lib/types";
import { Card, Title, Stack, Group, Select, Text } from "@mantine/core";

interface MealListProps {
  mealAssignments: MealAssignmentWithRecipe[]
  recipes: Recipe[];
  onRecipeChange: (mealAssignment: MealAssignmentWithRecipe, recipeId: string | null) => void
}

export function MealList({ mealAssignments, recipes, onRecipeChange }: MealListProps) {
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

  return (
    <Card>
      <Title order={3} mb="md">
        Meals
      </Title>
      <Stack gap="sm">
        {mealAssignments
          ?.sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          })
          .map((assignment: MealAssignmentWithRecipe, index) => {
            const dateStr = assignment.date ? new Date(assignment.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "numeric",
              day: "numeric",
            }) : 'No date';

            return (
              <Group key={index} justify="space-between">
                <Text w={80} size="sm">
                  {dateStr}
                </Text>
                <Select
                  placeholder="Select recipe..."
                  data={recipeOptions}
                  value={assignment?.recipe_id || ""}
                  onChange={(value) => handleRecipeChange(assignment, value || null)}
                  style={{ flex: 1 }}
                  clearable
                  size="sm"
                />
              </Group>
            );
          })}
      </Stack>
    </Card>
  );
}

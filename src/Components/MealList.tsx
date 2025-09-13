import { getMealAssignments, updateMealAssignment } from "@/lib/actions";
import { MealAssignmentWithRecipe } from "@/lib/types";
import { Card, Title, Stack, Group, Select, Text } from "@mantine/core";
import { Recipe } from "@prisma/client";

interface MealListProps {
  mealAssignments: MealAssignmentWithRecipe[]
  recipes: Recipe[];
  onRecipeChange: (mealAssignment: MealAssignmentWithRecipe, recipeId: number | null) => void
}

export function MealList({ mealAssignments, recipes, onRecipeChange }: MealListProps) {
  const recipeOptions = [
    { value: "", label: "Select recipe..." },
    ...recipes.map((recipe) => ({
      value: recipe.id.toString(),
      label:
        recipe.name.length > 40
          ? `${recipe.name.substring(0, 37)}...`
          : recipe.name,
    })),
  ];

  const handleRecipeChange = (assignment: MealAssignmentWithRecipe, recipeId: string | null) => {
    const recipeIdAdj = recipeId ? parseInt(recipeId) : null;
    onRecipeChange(assignment, recipeIdAdj)
  };

  return (
    <Card>
      <Title order={3} mb="md">
        Meals
      </Title>
      <Stack gap="sm">
        {mealAssignments
          ?.sort((x) => x.date.getTime())
          .map((assignment: MealAssignmentWithRecipe, index) => {
            return (
              <Group key={index} justify="space-between">
                <Text w={80} size="sm">
                  {assignment.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                  })}
                </Text>
                <Select
                  placeholder="Select recipe..."
                  data={recipeOptions}
                  value={assignment?.recipe_id?.toString() || ""}
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

import { MealWithDetails } from "@/lib/types";
import { Card, Text, Group, ActionIcon, Stack, Badge } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";

interface MealCardProps {
  meal: MealWithDetails;
  onEdit: (meal: MealWithDetails) => void;
  onDelete: (mealId: string) => void;
}

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  const hasRecipes = meal.meal_recipes && meal.meal_recipes.length > 0;
  const hasItems = meal.meal_items && meal.meal_items.length > 0;
  const isEmpty = !hasRecipes && !hasItems;

  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap="xs">
        {/* Header with meal name and actions */}
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            {meal.name ? (
              <Text size="sm" fw={600}>
                {meal.name}
              </Text>
            ) : (
              <Text size="sm" fw={600} c="dimmed">
                Meal
              </Text>
            )}
          </div>
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => onEdit(meal)}
              aria-label="Edit meal"
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => onDelete(meal.id)}
              aria-label="Delete meal"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Empty state */}
        {isEmpty && (
          <Text size="xs" c="dimmed" fs="italic">
            No recipes or items added yet
          </Text>
        )}

        {/* Recipes */}
        {hasRecipes && (
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              Recipes:
            </Text>
            <Group gap={6}>
              {meal.meal_recipes.map((mr) => (
                <Badge key={mr.id} size="sm" variant="light">
                  {mr.recipe.name}
                </Badge>
              ))}
            </Group>
          </div>
        )}

        {/* Items */}
        {hasItems && (
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              Items:
            </Text>
            <Stack gap={2}>
              {meal.meal_items.map((mi) => (
                <Text key={mi.id} size="xs">
                  {mi.item.name}
                  {mi.amount ? `: ${mi.amount}` : ""}
                </Text>
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}

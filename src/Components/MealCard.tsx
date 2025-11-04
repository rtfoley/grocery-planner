import { MealWithDetails } from "@/lib/types";
import { Card, Text, Group, ActionIcon, Stack, Badge } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { ConfirmationModal } from "./ConfirmationModal";

interface MealCardProps {
  meal: MealWithDetails;
  onEdit: (meal: MealWithDetails) => void;
  onDelete: (mealId: string) => Promise<void>;
}

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasRecipes = meal.meal_recipes && meal.meal_recipes.length > 0;
  const hasItems = meal.meal_items && meal.meal_items.length > 0;
  const isEmpty = !hasRecipes && !hasItems;

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(meal.id);
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card withBorder padding="xs" radius="sm">
      <Stack gap={4}>
        {/* Header with meal name and actions */}
        <Group justify="space-between" align="flex-start" gap="xs">
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
          <Group gap={6}>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => onEdit(meal)}
              aria-label="Edit meal"
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              onClick={handleDeleteClick}
              aria-label="Delete meal"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Empty state */}
        {isEmpty && (
          <Text size="sm" c="dimmed" fs="italic">
            Empty
          </Text>
        )}

        {/* Recipes */}
        {hasRecipes && (
          <Group gap={4} mt={2}>
            {meal.meal_recipes.map((mr) => (
              <Badge key={mr.id} size="sm" variant="light">
                {mr.recipe.name}
              </Badge>
            ))}
          </Group>
        )}

        {/* Items */}
        {hasItems && (
          <Stack gap={2} mt={2}>
            {meal.meal_items.map((mi) => (
              <Text key={mi.id} size="sm" c="dimmed">
                + {mi.item.name}
                {mi.amount ? ` (${mi.amount})` : ""}
              </Text>
            ))}
          </Stack>
        )}
      </Stack>

      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Meal"
        message={`Are you sure you want to delete "${meal.name || 'this meal'}"? This action cannot be undone.`}
        confirmLabel="Delete Meal"
        loading={deleting}
      />
    </Card>
  );
}

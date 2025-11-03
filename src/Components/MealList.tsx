import { MealWithDetails, Recipe, Item } from "@/lib/types";
import { getAdjustedDateFromString } from "@/lib/utilities";
import { Card, Title, Stack, Group, Text, Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { MealCard } from "./MealCard";
import { MealDialog, MealDialogData } from "./MealDialog";

interface MealListProps {
  meals: MealWithDetails[];
  sessionStartDate: string | null;
  sessionEndDate: string | null;
  recipes: Recipe[];
  allItems: Item[];
  onAddMeal: (date: string | null, mealData: MealDialogData) => Promise<void>;
  onUpdateMeal: (mealId: string, mealData: MealDialogData) => Promise<void>;
  onDeleteMeal: (mealId: string) => Promise<void>;
}

export function MealList({
  meals,
  sessionStartDate,
  sessionEndDate,
  recipes,
  allItems,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
}: MealListProps) {
  const [dialogOpened, setDialogOpened] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealWithDetails | null>(null);
  const [addingForDate, setAddingForDate] = useState<string | null>(null);

  // Generate all dates in session range
  const generateSessionDates = (): string[] => {
    if (!sessionStartDate || !sessionEndDate) return [];

    const dates: string[] = [];
    const start = getAdjustedDateFromString(sessionStartDate);
    const end = getAdjustedDateFromString(sessionEndDate);

    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Group meals by date
  const mealsByDate = meals.reduce((acc, meal) => {
    const date = meal.date || "undated";
    if (!acc[date]) acc[date] = [];
    acc[date].push(meal);
    return acc;
  }, {} as Record<string, MealWithDetails[]>);

  // Add all session dates (even if no meals)
  const sessionDates = generateSessionDates();
  sessionDates.forEach(date => {
    if (!mealsByDate[date]) {
      mealsByDate[date] = [];
    }
  });

  // Ensure 'undated' always exists (even if empty)
  if (!mealsByDate["undated"]) {
    mealsByDate["undated"] = [];
  }

  // Sort dates
  const sortedDates = Object.keys(mealsByDate).sort((a, b) => {
    if (a === "undated") return 1;
    if (b === "undated") return -1;
    return (
      getAdjustedDateFromString(a).getTime() -
      getAdjustedDateFromString(b).getTime()
    );
  });

  const handleAddMealClick = (date: string) => {
    setAddingForDate(date === "undated" ? null : date);
    setEditingMeal(null);
    setDialogOpened(true);
  };

  const handleEditMeal = (meal: MealWithDetails) => {
    setEditingMeal(meal);
    setAddingForDate(null);
    setDialogOpened(true);
  };
  
  const handleSaveMeal = async (mealData: MealDialogData) => {
    if (editingMeal) {
      // Update existing meal
      await onUpdateMeal(editingMeal.id, mealData);
    } else {
      // Create new meal
      await onAddMeal(addingForDate, mealData);
    }
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setDialogOpened(false);
    setEditingMeal(null);
    setAddingForDate(null);
  };

  return (
    <>
      <Card withBorder shadow="sm" padding="lg">
        <Stack gap="sm">
          <Title order={3}>Meals</Title>
          {sortedDates.map((date) => {
            const dateMeals = mealsByDate[date];
            const dateStr =
              date === "undated"
                ? "Additional Meals"
                : getAdjustedDateFromString(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                  });

            return (
              <Card
                key={date}
                withBorder
                padding="xs"
                style={{ backgroundColor: "var(--mantine-color-default-hover)" }}
              >
                <Stack gap="xs">
                  <Group justify="space-between" gap="xs">
                    <Text
                      size="sm"
                      fw={600}
                      c={date === "undated" ? "dimmed" : undefined}
                    >
                      {dateStr}
                    </Text>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      leftSection={<IconPlus size={12} />}
                      onClick={() => handleAddMealClick(date)}
                    >
                      Add
                    </Button>
                  </Group>

                  {/* Meal cards */}
                  {dateMeals.length > 0 ? (
                    dateMeals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onEdit={handleEditMeal}
                        onDelete={onDeleteMeal}
                      />
                    ))
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">
                      No meals
                    </Text>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      </Card>

      {/* Meal Dialog */}
      <MealDialog
        opened={dialogOpened}
        onClose={handleCloseDialog}
        onSave={handleSaveMeal}
        meal={editingMeal}
        recipes={recipes}
        allItems={allItems}
      />
    </>
  );
}

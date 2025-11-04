import { MealWithDetails, Recipe, Item } from "@/lib/types";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group,
  Text,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { RecipeAutocomplete } from "./RecipeAutocomplete";
import { ItemAutocomplete } from "./ItemAutocomplete";

interface MealDialogProps {
  opened: boolean;
  onClose: () => void;
  onSave: (mealData: MealDialogData) => Promise<void>;
  meal?: MealWithDetails | null;
  recipes: Recipe[];
  allItems: Item[];
}

export interface MealDialogData {
  name: string;
  recipeNames: string[];
  items: Array<{ name: string; amount: string }>;
}

export function MealDialog({
  opened,
  onClose,
  onSave,
  meal,
  recipes,
  allItems,
}: MealDialogProps) {
  const [mealName, setMealName] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    Array<{ name: string; amount: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for adding new recipe
  const [newRecipeName, setNewRecipeName] = useState("");

  // Form state for adding new item
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

  // Pre-populate form when editing a meal
  useEffect(() => {
    if (meal) {
      setMealName(meal.name || "");
      setSelectedRecipes(
        meal.meal_recipes?.map((mr) => mr.recipe.name) || []
      );
      setSelectedItems(
        meal.meal_items?.map((mi) => ({
          name: mi.item.name,
          amount: mi.amount || "",
        })) || []
      );
    } else {
      // Reset for new meal
      setMealName("");
      setSelectedRecipes([]);
      setSelectedItems([]);
    }
  }, [meal, opened]);

  const handleAddRecipe = () => {
    if (!newRecipeName.trim()) return;

    // Check if recipe exists
    const recipeExists = recipes.some(
      (r) => r.name.toLowerCase() === newRecipeName.toLowerCase().trim()
    );

    if (!recipeExists) {
      // Recipe doesn't exist - could show error or ignore
      return;
    }

    // Check if already added
    if (selectedRecipes.includes(newRecipeName.trim())) {
      return;
    }

    setSelectedRecipes([...selectedRecipes, newRecipeName.trim()]);
    setNewRecipeName("");
  };

  const handleRemoveRecipe = (recipeName: string) => {
    setSelectedRecipes(selectedRecipes.filter((r) => r !== recipeName));
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    // Check if item exists
    const itemExists = allItems.some(
      (i) => i.name.toLowerCase() === newItemName.toLowerCase().trim()
    );

    if (!itemExists) {
      // Item doesn't exist - could show error or ignore
      return;
    }

    // Check if already added
    if (selectedItems.some((i) => i.name === newItemName.toLowerCase().trim())) {
      return;
    }

    setSelectedItems([
      ...selectedItems,
      { name: newItemName.toLowerCase().trim(), amount: newItemAmount.trim() },
    ]);
    setNewItemName("");
    setNewItemAmount("");
  };

  const handleRemoveItem = (itemName: string) => {
    setSelectedItems(selectedItems.filter((i) => i.name !== itemName));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name: mealName.trim(),
        recipeNames: selectedRecipes,
        items: selectedItems,
      });
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setMealName("");
    setSelectedRecipes([]);
    setSelectedItems([]);
    setNewRecipeName("");
    setNewItemName("");
    setNewItemAmount("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={meal ? "Edit Meal" : "Add Meal"}
      size="md"
      centered
    >
      <Stack gap="lg">
        {/* Meal Name */}
        <TextInput
          label="Meal Name (optional)"
          placeholder="e.g., Dinner, Lunch"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
        />

        <Divider />

        {/* Recipes Section */}
        <div>
          <Text size="sm" fw={600} mb="xs">
            Recipes
          </Text>

          {/* Add recipe form */}
          <Group align="flex-end" mb="sm">
            <RecipeAutocomplete
              recipes={recipes}
              placeholder="Select recipe..."
              value={newRecipeName}
              onChange={setNewRecipeName}
              style={{ flex: 1 }}
              size="sm"
            />
            <Button
              size="sm"
              leftSection={<IconPlus size={14} />}
              onClick={handleAddRecipe}
              disabled={!newRecipeName.trim()}
            >
              Add
            </Button>
          </Group>

          {/* Selected recipes list */}
          {selectedRecipes.length > 0 ? (
            <Stack gap="xs">
              {selectedRecipes.map((recipeName) => (
                <Group key={recipeName} justify="space-between">
                  <Text size="sm">{recipeName}</Text>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="md"
                    onClick={() => handleRemoveRecipe(recipeName)}
                    aria-label={`Remove ${recipeName}`}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed" fs="italic">
              No recipes added
            </Text>
          )}
        </div>

        <Divider />

        {/* Items Section */}
        <div>
          <Text size="sm" fw={600} mb="xs">
            Additional Items
          </Text>

          {/* Add item form */}
          <Group align="flex-end" mb="sm">
            <ItemAutocomplete
              placeholder="Item name..."
              value={newItemName}
              onChange={setNewItemName}
              style={{ flex: 2 }}
              size="sm"
              items={allItems.map(item => item.name)}
            />
            <TextInput
              placeholder="Amount"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              style={{ flex: 1 }}
              size="sm"
            />
            <Button
              size="sm"
              leftSection={<IconPlus size={14} />}
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
            >
              Add
            </Button>
          </Group>

          {/* Selected items list */}
          {selectedItems.length > 0 ? (
            <Stack gap="xs">
              {selectedItems.map((item) => (
                <Group key={item.name} justify="space-between">
                  <Text size="sm">
                    {item.name}
                    {item.amount ? `: ${item.amount}` : ""}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="md"
                    onClick={() => handleRemoveItem(item.name)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed" fs="italic">
              No items added
            </Text>
          )}
        </div>

        {/* Actions */}
        <Group justify="flex-end" gap="sm" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save Meal
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

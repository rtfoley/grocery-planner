// src/Components/AddRecipeDialog.tsx
import { Modal, Select, Button, Group } from "@mantine/core";
import { useState, useEffect } from "react";
import { RecipeWithItems } from "@/lib/types";

interface AddRecipeDialogProps {
  opened: boolean;
  onClose: () => void;
  onSave: (recipeName: string) => Promise<void>;
  recipes: RecipeWithItems[];
}

export function AddRecipeDialog({
  opened,
  onClose,
  onSave,
  recipes,
}: AddRecipeDialogProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setSelectedRecipe(null);
    }
  }, [opened]);

  const handleSave = async () => {
    if (!selectedRecipe) return;

    setIsSaving(true);
    try {
      await onSave(selectedRecipe);
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedRecipe(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add Recipe"
      size="md"
      centered
    >
      <Group align="flex-end" gap="sm">
        <Select
          placeholder="Select recipe..."
          data={recipes.map((r) => r.name)}
          value={selectedRecipe}
          onChange={(value) => setSelectedRecipe(value)}
          searchable
          style={{ flex: 1 }}
        />
        <Button onClick={handleSave} loading={isSaving} disabled={!selectedRecipe}>
          Add
        </Button>
      </Group>
    </Modal>
  );
}

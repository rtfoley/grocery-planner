// src/Components/AddItemDialog.tsx
import { Modal, Select, TextInput, Button, Group, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import { Item } from "@/lib/types";

interface AddItemDialogProps {
  opened: boolean;
  onClose: () => void;
  onSave: (itemName: string, amount: string) => Promise<void>;
  allItems: Item[];
}

export function AddItemDialog({
  opened,
  onClose,
  onSave,
  allItems,
}: AddItemDialogProps) {
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setSelectedItem("");
      setAmount("");
    }
  }, [opened]);

  const handleSave = async () => {
    if (!selectedItem.trim()) return;

    setIsSaving(true);
    try {
      await onSave(selectedItem.toLowerCase().trim(), amount.trim());
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedItem("");
    setAmount("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add Item"
      size="md"
      centered
    >
      <Stack gap="md">
        <Select
          placeholder="Select item..."
          data={allItems.map((i) => i.name)}
          value={selectedItem}
          onChange={(value) => setSelectedItem(value || "")}
          searchable
        />
        <TextInput
          placeholder="Amount (optional)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving} disabled={!selectedItem}>
            Add
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

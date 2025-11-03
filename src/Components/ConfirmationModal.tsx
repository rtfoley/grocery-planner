// src/Components/ConfirmationModal.tsx
import { Modal, Text, Group, Button } from '@mantine/core'

interface ConfirmationModalProps {
  opened: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
  loading?: boolean
}

export function ConfirmationModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'red',
  loading = false,
}: ConfirmationModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size="sm"
    >
      <Text mb="md">{message}</Text>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button color={confirmColor} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  )
}

// src/Components/StoreOrderManager.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Card,
  Text,
  Stack,
  Group,
  ActionIcon,
  Alert,
  Button,
  Grid,
} from '@mantine/core'
import { IconGripVertical, IconAlertCircle, IconTrash } from '@tabler/icons-react'
import { updateMultipleItemOrders } from '@/lib/actions'

interface Item {
  id: string
  name: string
  store_order_index: number | null
}

export function StoreOrderManager({ items }: { items: Item[] }) {
  const [saving, setSaving] = useState(false)

  // initial split
  const initialOrdered = useMemo(
    () =>
      items
        .filter(i => i.store_order_index !== null)
        .sort((a, b) => (a.store_order_index! - b.store_order_index!)),
    [items]
  )
  const initialUnordered = useMemo(
    () => items.filter(i => i.store_order_index === null).sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  )

  const [orderedItems, setOrderedItems] = useState<Item[]>(initialOrdered)
  const [unorderedItems, setUnorderedItems] = useState<Item[]>(initialUnordered)

  // sync props -> state (e.g. after server refresh)
  useEffect(() => {
    setOrderedItems(initialOrdered)
    setUnorderedItems(initialUnordered)
  }, [initialOrdered, initialUnordered])

  // for detecting changes
  const initialOrderedIds = useMemo(() => initialOrdered.map(i => i.id), [initialOrdered])

  const sensors = useSensors(useSensor(PointerSensor))

  // helper: find by id (coerce to string to avoid type mismatches)
  const indexOfById = (arr: Item[], id: string) => arr.findIndex(i => String(i.id) === String(id))

  // reorder inside ordered list only (no cross-list drag)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = indexOfById(orderedItems, String(active.id))
    const newIndex = indexOfById(orderedItems, String(over.id))

    // if active or over is not in orderedItems, ignore (prevents cross-list moves)
    if (oldIndex === -1 || newIndex === -1) return

    if (oldIndex !== newIndex) {
      setOrderedItems(prev => arrayMove(prev, oldIndex, newIndex))
    }
  }

  const addToOrder = (id: string, positionIndex?: number) => {
    const idx = indexOfById(unorderedItems, id)
    if (idx === -1) return
    const item = unorderedItems[idx]
    setUnorderedItems(prev => prev.filter(i => String(i.id) !== String(id)))
    setOrderedItems(prev => {
      const copy = [...prev]
      if (positionIndex == null) copy.push(item)
      else copy.splice(positionIndex, 0, item)
      return copy
    })
  }

  const removeFromOrder = (id: string) => {
    const idx = indexOfById(orderedItems, id)
    if (idx === -1) return
    const item = orderedItems[idx]
    setOrderedItems(prev => prev.filter(i => String(i.id) !== String(id)))
    setUnorderedItems(prev => {
      const copy = [...prev, item]
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  const handleSaveOrder = async () => {
    setSaving(true)
    const updates = [
      ...orderedItems.map((it, i) => ({ id: it.id, orderIndex: i + 1 })),
      ...unorderedItems.map(it => ({ id: it.id, orderIndex: null })),
    ]
    await updateMultipleItemOrders(updates)
    // State is already updated optimistically via local drag-and-drop operations
    setSaving(false)
  }

  const hasChanges = useMemo(() => {
    if (initialOrderedIds.length !== orderedItems.length) return true
    for (let i = 0; i < initialOrderedIds.length; i++) if (initialOrderedIds[i] !== orderedItems[i]?.id) return true
    return false
  }, [orderedItems, initialOrderedIds])

  // Sortable item used in ordered list
  function SortableOrderedItem({ item, index }: { item: Item; index: number }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div ref={setNodeRef} style={style}>
        <Card withBorder p="sm">
          <Group justify='space-between' wrap="nowrap">
            {/* Drag handle - larger touch target */}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              style={{ cursor: 'grab', touchAction: 'none' }}
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
            >
              <IconGripVertical size={20} />
            </ActionIcon>

            <Text style={{ flex: 1 }}>
              <strong>{index + 1}.</strong>&nbsp;{item.name}
            </Text>

            <ActionIcon
              color="red"
              variant="subtle"
              size="sm"
              onClick={() => removeFromOrder(item.id)}
              aria-label="Remove from route"
            >
              <IconTrash />
            </ActionIcon>
          </Group>
        </Card>
      </div>
    )
  }

  return (
    <Grid gutter={{ base: "xl" }}>
        <Grid.Col span={12}>
            {hasChanges && (
                <Alert icon={<IconAlertCircle size={16} />} title="Unsaved Changes">
                <Group>
                    <Text size="sm">You have unsaved changes to the store order.</Text>
                    <Button size="sm" onClick={handleSaveOrder} loading={saving}>
                    Save Order
                    </Button>
                </Group>
                </Alert>
            )}
            <Text c="dimmed">
                Add items to the route, then drag inside the “Store Route Order” list to arrange them.
            </Text>      
        </Grid.Col>
        <Grid.Col span={{base:12, lg: 6}}>
            <Text fw={500} mb="xs">
                Unordered Items ({unorderedItems.length})
            </Text>
            {unorderedItems.map(item => (
                <Card withBorder p="sm" key={item.id}>
                    <Group justify="space-between">
                    <Text>{item.name}</Text>
                    <Button size="xs" onClick={() => addToOrder(item.id)}>
                        Add to Route
                    </Button>
                    </Group>
                </Card>
            ))}
        </Grid.Col>
        <Grid.Col span={{base:12, lg: 6}}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div>
                <Text fw={500} mb="xs">
                    Store Route Order ({orderedItems.length})
                </Text>
                <SortableContext items={orderedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <Stack gap="xs">
                    {orderedItems.map((item, idx) => (
                        <SortableOrderedItem key={item.id} item={item} index={idx} />
                    ))}
                    </Stack>
                </SortableContext>
                </div>
            </DndContext>
        </Grid.Col>
    </Grid>
  )
}

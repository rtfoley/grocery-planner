'use client'

import { useEffect, useMemo, useState } from 'react'
import { Table, Checkbox, TextInput, Button, Group, Text, Stack, Card, SegmentedControl, Modal } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { updateItem, updateItemStapleStatus, createItem } from '@/lib/actions'
import { useMediaQuery } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'

interface Item {
  id: string
  aisle_number: number | null
  name: string
  is_staple: boolean
  staple_amount: string | null
}

interface ItemsManagerProps {
  items: Item[]
}

export function ItemsManager({ items: initialItems }: ItemsManagerProps) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [filter, setFilter] = useState<string>('all')
  const [sortMode, setSortMode] = useState<'name' | 'aisle'>('name')

  // New item form
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemIsStaple, setNewItemIsStaple] = useState(true)
  const [creatingItem, setCreatingItem] = useState(false)

  // Edit modal
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editName, setEditName] = useState('')
  const [editAisle, setEditAisle] = useState<number | ''>('')
  const [editIsStaple, setEditIsStaple] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const isLargeScreen = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const filteredItems = useMemo(() => {
    const filtered = filter === 'staples'
      ? items.filter(item => item.is_staple)
      : items

    return [...filtered].sort((a, b) => {
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (a.aisle_number == null && b.aisle_number == null) return a.name.localeCompare(b.name)
      if (a.aisle_number == null) return 1
      if (b.aisle_number == null) return -1
      const aisleCompare = a.aisle_number - b.aisle_number
      return aisleCompare !== 0 ? aisleCompare : a.name.localeCompare(b.name)
    })
  }, [items, filter, sortMode])

  const unassignedAisleCount = useMemo(() => {
    const filtered = filter === 'staples' ? items.filter(i => i.is_staple) : items
    return filtered.filter(i => i.aisle_number == null).length
  }, [items, filter])

  const stapleCount = items.filter(i => i.is_staple).length

  const openEditModal = (item: Item) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditAisle(item.aisle_number ?? '')
    setEditIsStaple(item.is_staple)
    setEditAmount(item.staple_amount ?? '')
  }

  const closeEditModal = () => {
    setEditingItem(null)
    setEditName('')
    setEditAisle('')
    setEditIsStaple(false)
    setEditAmount('')
  }

  const handleSaveItem = async () => {
    if (!editingItem || !editName.trim()) return
    setSaving(true)

    const result = await updateItem(editingItem.id, {
      name: editName.trim(),
      aisle_number: editAisle === '' ? null : Number(editAisle),
      is_staple: editIsStaple,
      staple_amount: editIsStaple ? editAmount.trim() || null : null
    })

    if (result.success && result.item) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? result.item : i))
      notifications.show({ title: 'Saved', message: `${result.item.name} updated`, color: 'green' })
      closeEditModal()
    } else {
      notifications.show({ title: 'Error', message: result.error || 'Failed to save item', color: 'red' })
    }

    setSaving(false)
  }

  const handleStapleToggle = async (item: Item) => {
    const newIsStaple = !item.is_staple

    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_staple: newIsStaple } : i))

    const result = await updateItemStapleStatus(item.id, newIsStaple, newIsStaple ? item.staple_amount || undefined : undefined)

    if (result.success && result.item) {
      setItems(prev => prev.map(i => i.id === item.id ? result.item : i))
    } else {
      // Revert on failure
      setItems(prev => prev.map(i => i.id === item.id ? item : i))
      notifications.show({ title: 'Error', message: 'Failed to update staple status', color: 'red' })
    }
  }

  const handleCreateItem = async () => {
    if (!newItemName.trim()) return
    setCreatingItem(true)

    const result = await createItem(
      newItemName.trim(),
      newItemIsStaple,
      newItemIsStaple ? newItemAmount.trim() || undefined : undefined
    )

    if (result.success && result.item) {
      setItems(prev => [...prev, result.item])
      setNewItemName('')
      setNewItemAmount('')
      setNewItemIsStaple(true)
      notifications.show({ title: 'Added', message: `${result.item.name} created`, color: 'green' })
    } else {
      notifications.show({ title: 'Error', message: result.error || 'Failed to create item', color: 'red' })
    }

    setCreatingItem(false)
  }

  return (
    <Stack gap="xl">
      {/* Edit Item Modal */}
      <Modal
        opened={!!editingItem}
        onClose={closeEditModal}
        title={`Edit: ${editingItem?.name}`}
        centered
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Item Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <TextInput
            label="Aisle Number"
            placeholder="—"
            value={editAisle}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setEditAisle(val === '' ? '' : Number(val))
            }}
          />
          <Checkbox
            label="Staple Item"
            checked={editIsStaple}
            onChange={(e) => setEditIsStaple(e.currentTarget.checked)}
          />
          <TextInput
            label="Default Amount"
            placeholder="e.g. 1 gallon"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            disabled={!editIsStaple}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeEditModal}>Cancel</Button>
            <Button onClick={handleSaveItem} loading={saving} disabled={!editName.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create New Item */}
      <Card>
        <Text fw={500} mb="md">Add New Item</Text>
        {isLargeScreen ? (
          <Group align="flex-end">
            <TextInput
              label="Item Name"
              placeholder="Enter item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateItem()}
              style={{ flex: 2 }}
            />
            <TextInput
              label="Default Amount (optional)"
              placeholder="e.g. 1 gallon"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              style={{ flex: 1 }}
              disabled={!newItemIsStaple}
            />
            <Checkbox
              label="Make Staple"
              checked={newItemIsStaple}
              onChange={(e) => setNewItemIsStaple(e.currentTarget.checked)}
              mb="8"
            />
            <Button
              onClick={handleCreateItem}
              loading={creatingItem}
              disabled={!newItemName.trim()}
              leftSection={<IconPlus size={16} />}
            >
              Add
            </Button>
          </Group>
        ) : (
          <Stack gap="sm">
            <TextInput
              label="Item Name"
              placeholder="Enter item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <TextInput
              label="Default Amount (optional)"
              placeholder="e.g. 1 gallon"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              disabled={!newItemIsStaple}
            />
            <Checkbox
              label="Make Staple"
              checked={newItemIsStaple}
              onChange={(e) => setNewItemIsStaple(e.currentTarget.checked)}
            />
            <Button
              onClick={handleCreateItem}
              loading={creatingItem}
              disabled={!newItemName.trim()}
              leftSection={<IconPlus size={16} />}
              fullWidth
            >
              Add Item
            </Button>
          </Stack>
        )}
      </Card>

      {/* Filter Controls */}
      <Group justify="space-between" align="flex-end">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { label: `All Items (${items.length})`, value: 'all' },
            { label: `Staples Only (${stapleCount})`, value: 'staples' }
          ]}
        />
        <Group gap="xs">
          <Text size="sm" c="dimmed">Sort by</Text>
          <SegmentedControl
            value={sortMode}
            onChange={(value) => setSortMode(value as 'name' | 'aisle')}
            data={[
              { label: 'Name', value: 'name' },
              { label: 'Aisle', value: 'aisle' }
            ]}
          />
        </Group>
      </Group>

      {sortMode === 'aisle' && unassignedAisleCount > 0 && (
        <Text size="sm" c="dimmed">
          {unassignedAisleCount} item{unassignedAisleCount === 1 ? '' : 's'} without aisle numbers appear at the bottom.
        </Text>
      )}

      {/* Items Table */}
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '40%' }}>Name</Table.Th>
            <Table.Th style={{ width: '25%' }}>Default Amount</Table.Th>
            <Table.Th style={{ width: '15%', textAlign: 'center' }}>Aisle</Table.Th>
            <Table.Th style={{ width: '10%', textAlign: 'center' }}>Staple</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredItems.map((item) => (
            <Table.Tr
              key={item.id}
              onClick={() => openEditModal(item)}
              style={{ cursor: 'pointer' }}
            >
              <Table.Td>
                <Text fw={item.is_staple ? 500 : 400}>{item.name}</Text>
              </Table.Td>
              <Table.Td>
                <Text c={item.staple_amount ? undefined : 'dimmed'}>
                  {item.staple_amount || (item.is_staple ? 'No default amount' : '—')}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center' }}>
                <Text c={item.aisle_number ? undefined : 'dimmed'}>
                  {item.aisle_number ?? '—'}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center' }}>
                <Group justify="center">
                          <Checkbox
                    checked={item.is_staple}
                    readOnly
                    onClick={(e) => e.stopPropagation()}
                  />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
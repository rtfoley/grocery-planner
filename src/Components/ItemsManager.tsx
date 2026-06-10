// src/Components/ItemsManager.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Table, Checkbox, TextInput, Button, Group, ActionIcon, Text, Stack, Card, SegmentedControl } from '@mantine/core'
import { IconEdit, IconCheck, IconX, IconPlus } from '@tabler/icons-react'
import { updateItemAisle, updateItemStapleStatus, createItem } from '@/lib/actions'
import { useMediaQuery } from '@mantine/hooks'

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

// TODO add ability to edit item name
// TODO add-item form doesn't reset after adding
// TODO no notifications?
export function ItemsManager({ items: initialItems }: ItemsManagerProps) {
  // Local state for optimistic updates
  const [items, setItems] = useState<Item[]>(initialItems)
  const [savedAisles, setSavedAisles] = useState(() => new Map(initialItems.map(item => [item.id, item.aisle_number])))
  const [filter, setFilter] = useState<string>('all')
  const [sortMode, setSortMode] = useState<'name' | 'aisle'>('name')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  // New item form
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemIsStaple, setNewItemIsStaple] = useState(true)
  const [creatingItem, setCreatingItem] = useState(false)

  // Use horizontal layout on medium+ screens, vertical on mobile
  const isLargeScreen = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    setItems(initialItems)
    setSavedAisles(new Map(initialItems.map(item => [item.id, item.aisle_number])))
  }, [initialItems])

  // Filter items based on selection
  const filteredItems = useMemo(() => {
    const filtered = filter === 'staples'
      ? items.filter(item => item.is_staple)
      : items

    return [...filtered].sort((a, b) => {
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (a.aisle_number == null && b.aisle_number == null) {
        return a.name.localeCompare(b.name)
      }
      if (a.aisle_number == null) return 1
      if (b.aisle_number == null) return -1

      const aisleCompare = a.aisle_number - b.aisle_number
      return aisleCompare !== 0 ? aisleCompare : a.name.localeCompare(b.name)
    })
  }, [items, filter, sortMode])

  const unassignedAisleCount = useMemo(() => {
    const filtered = filter === 'staples'
      ? items.filter(item => item.is_staple)
      : items

    return filtered.filter(item => item.aisle_number == null).length
  }, [items, filter])

  const handleStapleToggle = async (item: Item) => {
    setLoading(item.id)

    // Optimistic update
    const newIsStaple = !item.is_staple
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, is_staple: newIsStaple }
        : i
    ))

    const result = await updateItemStapleStatus(
      item.id,
      newIsStaple,
      newIsStaple ? item.staple_amount || undefined : undefined
    )

    // Update with server response if available
    if (result.success && result.item) {
      setItems(prev => prev.map(i =>
        i.id === item.id ? result.item : i
      ))
    }

    setLoading(null)
  }

  const handleEditAmount = (item: Item) => {
    setEditingId(item.id)
    setEditAmount(item.staple_amount || '')
  }

  const handleSaveAmount = async (item: Item) => {
    setLoading(item.id)

    // Optimistic update
    const newAmount = editAmount.trim() || null
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, staple_amount: newAmount }
        : i
    ))

    const result = await updateItemStapleStatus(
      item.id,
      true,
      newAmount || undefined
    )

    // Update with server response if available
    if (result.success && result.item) {
      setItems(prev => prev.map(i =>
        i.id === item.id ? result.item : i
      ))
    }

    setEditingId(null)
    setEditAmount('')
    setLoading(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditAmount('')
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
      // Add new item to the list
      setItems(prev => [...prev, result.item])
      setSavedAisles(prev => new Map(prev).set(result.item.id, result.item.aisle_number))
      setNewItemName('')
      setNewItemAmount('')
      setNewItemIsStaple(true)
    }

    setCreatingItem(false)
  }

  const handleAisleChange = (id: string, value: string) => {
    const normalizedValue = value.replace(/\D/g, '')
    const aisleNumber = normalizedValue === '' ? null : Number(normalizedValue)

    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, aisle_number: aisleNumber }
        : item
    ))
  }

  const handleSaveAisle = async (item: Item) => {
    if (savedAisles.get(item.id) === item.aisle_number) return

    setLoading(`aisle-${item.id}`)

    const result = await updateItemAisle(item.id, item.aisle_number)

    if (result.success && result.item) {
      setItems(prev => prev.map(i =>
        i.id === item.id ? result.item : i
      ))
      setSavedAisles(prev => new Map(prev).set(item.id, result.item.aisle_number))
    }

    setLoading(null)
  }

  const stapleCount = items.filter(item => item.is_staple).length

  return (
    <Stack gap="xl">
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
              label = "Make Staple"
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
              label = "Make Staple"
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
          <Text size="sm" c="dimmed">
            Sort by
          </Text>
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
      <Table>
        <thead>
          <tr>
            <th style={{ width: '35%' }}>Name</th>
            <th style={{ width: '25%', }}>Default Amount</th>
            <th style={{ width: '15%' }}>Aisle</th>
            <th style={{ width: '10%', }}>Staple</th>
            <th style={{ width: '15%', }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id}>
              <td>
                <Text fw={item.is_staple ? 500 : 400}>
                  {item.name}
                </Text>
              </td>
              <td style={{ textAlign: "center"}}>
                {editingId === item.id ? (
                  <TextInput
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="Enter amount"
                    size="sm"
                  />
                ) : (
                  <Text c={item.staple_amount ? undefined : 'dimmed'}>
                    {item.staple_amount || (item.is_staple ? 'No default amount' : '—')}
                  </Text>
                )}
              </td>
              <td>
                <TextInput
                  aria-label={`Aisle number for ${item.name}`}
                  placeholder="—"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={item.aisle_number?.toString() ?? ''}
                  onChange={(event) => handleAisleChange(item.id, event.currentTarget.value)}
                  onBlur={() => handleSaveAisle(item)}
                  disabled={loading === `aisle-${item.id}`}
                  size="sm"
                  styles={{ input: { textAlign: 'center' } }}
                />
              </td>
              <td>
                <Group justify="center">
                  <Checkbox
                    checked={item.is_staple}
                    onChange={() => handleStapleToggle(item)}
                    disabled={loading === item.id}
                  />
                </Group>
              </td>
              <td style={{ textAlign: 'center' }}>
                {item.is_staple && (
                  editingId === item.id ? (
                    <Group gap="xs" justify="center">
                      <ActionIcon
                        color="green"
                        variant="subtle"
                        onClick={() => handleSaveAmount(item)}
                        loading={loading === item.id}
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="gray"
                        variant="subtle"
                        onClick={handleCancelEdit}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <ActionIcon
                      variant="subtle"
                      onClick={() => handleEditAmount(item)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Stack>
  )
}

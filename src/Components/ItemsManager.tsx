// src/Components/ItemsManager.tsx
'use client'

import { useState, useMemo } from 'react'
import { Table, Checkbox, TextInput, Button, Group, ActionIcon, Text, Stack, Card, SegmentedControl } from '@mantine/core'
import { IconEdit, IconCheck, IconX, IconPlus } from '@tabler/icons-react'
import { updateItemStapleStatus, createItem } from '@/lib/actions'
import { useRouter } from 'next/navigation'

interface Item {
  id: number
  name: string
  is_staple: boolean
  staple_amount: string | null
}

interface ItemsManagerProps {
  items: Item[]
}

export function ItemsManager({ items }: ItemsManagerProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [loading, setLoading] = useState<number | null>(null)
  
  // New item form
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemIsStaple, setNewItemIsStaple] = useState(true)
  const [creatingItem, setCreatingItem] = useState(false)

  // Filter items based on selection
  const filteredItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
    
    if (filter === 'staples') {
      return sorted.filter(item => item.is_staple)
    }
    return sorted
  }, [items, filter])

  const handleStapleToggle = async (item: Item) => {
    setLoading(item.id)
    
    const result = await updateItemStapleStatus(
      item.id, 
      !item.is_staple, 
      !item.is_staple ? item.staple_amount || undefined : undefined
    )
    
    if (result.success) {
      router.refresh()
    }
    
    setLoading(null)
  }

  const handleEditAmount = (item: Item) => {
    setEditingId(item.id)
    setEditAmount(item.staple_amount || '')
  }

  const handleSaveAmount = async (item: Item) => {
    setLoading(item.id)
    
    const result = await updateItemStapleStatus(
      item.id,
      true,
      editAmount.trim() || undefined
    )
    
    if (result.success) {
      setEditingId(null)
      setEditAmount('')
      router.refresh()
    }
    
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
    
    if (result.success) {
      setNewItemName('')
      setNewItemAmount('')
      setNewItemIsStaple(true)
      router.refresh()
    }
    
    setCreatingItem(false)
  }

  const stapleCount = items.filter(item => item.is_staple).length

  return (
    <Stack gap="xl">
      {/* Create New Item */}
      <Card>
        <Text fw={500} mb="md">Add New Item</Text>
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
      </Group>

      {/* Items Table */}
      <Table>
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Name</th>
            <th style={{ width: '30%', }}>Default Amount</th>
            <th style={{ width: '15%', }}>Staple</th>
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
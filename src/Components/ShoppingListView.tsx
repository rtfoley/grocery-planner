// src/Components/ShoppingListView.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Stack,
  Title,
  Card,
  Checkbox,
  Group,
  Text,
  Button,
  Loader,
  Center,
  Paper,
  SegmentedControl
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import {
  PlanningSession,
  ShoppingListItemWithItem,
  MealWithDetails,
  StapleSelectionWithItem,
  ItemExclusionWithItem,
  AdhocItemWithItem,
  Item
} from '@/lib/types'
import {
  getShoppingListItems,
  toggleShoppingListItem,
  addShoppingListItemByName,
  getMeals,
  getStapleSelections,
  getItemExclusions,
  getAdhocItems
} from '@/lib/actions'
import { getAdjustedDateFromString } from '@/lib/utilities'
import { calculateNeededItems } from '@/lib/shoppingListUtils'
import { ItemAutocomplete } from './ItemAutocomplete'

interface ShoppingListViewProps {
  sessions: PlanningSession[]
  sessionId: string | null
}

type SortMode = 'alphabetical' | 'store-order'

export function ShoppingListView({ sessions, sessionId }: ShoppingListViewProps) {
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItemWithItem[]>([])
  const [meals, setMeals] = useState<MealWithDetails[]>([])
  const [staples, setStaples] = useState<StapleSelectionWithItem[]>([])
  const [exclusions, setExclusions] = useState<ItemExclusionWithItem[]>([])
  const [adhocItems, setAdhocItems] = useState<AdhocItemWithItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('store-order')
  const [showPurchased, setShowPurchased] = useState(false)
  const [newItemName, setNewItemName] = useState('')

  // Find current session details for display
  const currentSession = sessions.find(s => s.id === sessionId)

  // Load all data when session changes
  useEffect(() => {
    if (!sessionId) {
      setShoppingListItems([])
      setMeals([])
      setStaples([])
      setExclusions([])
      setAdhocItems([])
      return
    }

    async function loadData() {
      if (!sessionId) return

      setIsLoading(true)
      try {
        const [shoppingItems, mealsData, staplesData, exclusionsData, adhocData] = await Promise.all([
          getShoppingListItems(sessionId),
          getMeals(sessionId),
          getStapleSelections(sessionId),
          getItemExclusions(sessionId),
          getAdhocItems(sessionId)
        ])

        setShoppingListItems(shoppingItems)
        setMeals(mealsData)
        setStaples(staplesData)
        setExclusions(exclusionsData)
        setAdhocItems(adhocData)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sessionId])

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    if (!sessionId) return

    // Optimistic update
    const item = Array.from(neededItems.entries()).find(([id]) => id === itemId)?.[1]
    setShoppingListItems(prev => {
      const existing = prev.find(si => si.item_id === itemId)

      if (existing) {
        // Update existing item
        return prev.map(si => si.item_id === itemId ? { ...si, checked } : si)
      } else if (item) {
        // Add new item
        return [...prev, {
          planning_session_id: sessionId,
          item_id: itemId,
          item,
          checked,
          id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      }
      return prev
    })

    // Persist to DB and replace with server response
    const result = await toggleShoppingListItem(sessionId, itemId, checked)
    if (result) {
      setShoppingListItems(prev =>
        prev.map(si => si.item_id === itemId ? result : si)
      )
    }
  }

  const handleAddItem = async () => {
    if (!sessionId || !newItemName.trim()) return

    const newItem = await addShoppingListItemByName(sessionId, newItemName.trim())
    if (newItem) {
      setShoppingListItems(prev => [...prev, newItem])
      setNewItemName('')
    }
  }

  // Calculate all needed items (excluding exclusions)
  const neededItems = useMemo(() => {
    const allItems = calculateNeededItems(meals, staples, adhocItems)

    // Filter out excluded items
    const excludedIds = new Set(exclusions.map(e => e.item_id))
    excludedIds.forEach(id => allItems.delete(id))

    return allItems
  }, [meals, staples, adhocItems, exclusions])

  // Merge needed items with persisted checked state
  const mergedItems = useMemo(() => {
    const items = Array.from(neededItems.entries()).map(([itemId, item]) => {
      // Find if this item exists in shopping_list_items (persisted state)
      const persistedItem = shoppingListItems.find(si => si.item_id === itemId)

      return {
        item,
        item_id: itemId,
        checked: persistedItem?.checked || false
      }
    })

    // Also include any manually added items that aren't in the needed items
    // (items that were added via the "Add Item" button but aren't part of meal plan)
    shoppingListItems.forEach(si => {
      if (!neededItems.has(si.item_id)) {
        items.push({
          item: si.item,
          item_id: si.item_id,
          checked: si.checked
        })
      }
    })

    return items
  }, [neededItems, shoppingListItems])

  // Get sorted and filtered items for display
  const displayItems = useMemo(() => {
    // Filter by show purchased
    const filtered = showPurchased ? mergedItems : mergedItems.filter(i => !i.checked)

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === 'alphabetical') {
        return a.item.name.localeCompare(b.item.name)
      } else {
        // Store order
        const aOrder = a.item.store_order_index ?? 999999
        const bOrder = b.item.store_order_index ?? 999999
        return aOrder - bOrder
      }
    })

    return sorted
  }, [mergedItems, showPurchased, sortMode])

  const checkedCount = mergedItems.filter(i => i.checked).length
  const totalCount = mergedItems.length

  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>Shopping List</Title>
        {currentSession && (
          <Text c="dimmed" size="sm" mt="xs">
            {getAdjustedDateFromString(currentSession.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })} - {getAdjustedDateFromString(currentSession.end_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        )}
      </div>

      {!sessionId ? (
        <Center h={300}>
          <Paper p="xl" withBorder>
            <Stack align="center" gap="md">
              <Text size="lg" fw={500}>No Planning Session Selected</Text>
              <Text c="dimmed" ta="center">
                Navigate to this page with a session ID: /shopping?session=xxx
              </Text>
            </Stack>
          </Paper>
        </Center>
      ) : isLoading ? (
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      ) : (
        <Stack gap="md">
          {/* Progress indicator and controls */}
          <Group justify="space-between">
            <Text size="lg" fw={600}>
              {checkedCount} of {totalCount} checked
            </Text>
            <Group gap="md">
              <SegmentedControl
                value={sortMode}
                onChange={(value) => setSortMode(value as SortMode)}
                data={[
                  { label: 'A-Z', value: 'alphabetical' },
                  { label: 'Store Order', value: 'store-order' }
                ]}
              />
              <Button
                variant={showPurchased ? 'filled' : 'light'}
                onClick={() => setShowPurchased(!showPurchased)}
                size="compact-sm"
              >
                {showPurchased ? 'Hide Purchased' : 'Show Purchased'}
              </Button>
            </Group>
          </Group>

          {/* Shopping list */}
          <Card withBorder padding="md">
            <Stack gap="xs">
              {displayItems.length === 0 ? (
                <Text c="dimmed" fs="italic">
                  {showPurchased ? 'No items' : 'All items checked!'}
                </Text>
              ) : (
                displayItems.map(({ item, item_id, checked }) => (
                  <Checkbox
                    key={item_id}
                    label={item.name}
                    checked={checked}
                    onChange={(e) => handleToggleItem(item_id, e.currentTarget.checked)}
                    styles={{
                      root: { padding: '0.5rem' },
                      label: { fontSize: '1.1rem', cursor: 'pointer' }
                    }}
                  />
                ))
              )}
            </Stack>
          </Card>

          {/* Add item */}
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Title order={4}>Add Item</Title>
              <Group gap="xs" align="flex-end">
                <ItemAutocomplete
                  value={newItemName}
                  onChange={(value) => setNewItemName(value)}
                  placeholder="Item name"
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                >
                  Add
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}

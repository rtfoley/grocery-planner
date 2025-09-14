// src/Components/ShoppingList.tsx
'use client'

import { useMemo, useState } from 'react'
import { Card, Title, Text, Stack, Checkbox, Group, TextInput, Button, ActionIcon, Alert, SegmentedControl } from '@mantine/core'
import { IconPlus, IconTrash, IconAlertCircle } from '@tabler/icons-react'
import Link from 'next/link'
import { AdhocItemWithItem, ItemExclusionWithItem, RecipeWithItems, StapleSelectionWithItem } from '@/lib/types'
import { Item, StapleStatus } from '@prisma/client'
import { ItemAutocomplete } from './ItemAutocomplete'

interface ShoppingListProps {
  recipes: RecipeWithItems[]
  excludedItems?: ItemExclusionWithItem[]
  onExcludeItem?: (itemId: number) => void
  onUnexcludeItem?: (itemExclusion: ItemExclusionWithItem) => void
  adHocItems?: AdhocItemWithItem[]
  onAddAdHocItem?: (itemName: string, amount: string) => void
  onUpdateAdhocItem?: (updatedItem: AdhocItemWithItem) => void
  onRemoveAdHocItem?: (removedItem: AdhocItemWithItem) => void
  stapleSelections?: StapleSelectionWithItem[]
  allItems?: Item[]
}

interface ShoppingItem {
  itemName: string
  amounts: string[]
  recipeCount: number
  isAdHoc?: boolean
  isStaple?: boolean
  orderIndex?: number | null
}

export function ShoppingList({ 
  recipes, 
  excludedItems, 
  onExcludeItem,
  onUnexcludeItem,
  adHocItems = [],
  onAddAdHocItem,
  onRemoveAdHocItem,
  stapleSelections,
  allItems = []
}: ShoppingListProps) {
  // State for adding new ad-hoc items and sorting preference
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [sortMode, setSortMode] = useState<'store' | 'alphabetical'>('store')

  // Create lookup map for store ordering
  const orderLookup = useMemo(() => {
    return new Map(allItems.map(item => [item.name, item.store_order_index]))
  }, [allItems])

  // Process recipe items into shopping list format
  const recipeShoppingItems = useMemo(() => {
    const itemMap = new Map<string, ShoppingItem>()

    recipes.forEach(recipe => {
      recipe.recipe_items.forEach(recipeItem => {
        const itemName = recipeItem.item.name
        const existing = itemMap.get(itemName)
        
        if (existing) {
          existing.recipeCount += 1
          if (recipeItem.amount) {
            existing.amounts.push(recipeItem.amount)
          }
        } else {
          itemMap.set(itemName, {
            itemName,
            amounts: recipeItem.amount ? [recipeItem.amount] : [],
            recipeCount: 1,
            orderIndex: orderLookup.get(itemName)
          })
        }
      })
    })

    return Array.from(itemMap.values())
  }, [recipes, orderLookup])

  // Combine recipe items, ad-hoc items, and selected staples for display
  const allShoppingItems = useMemo(() => {
    // Start with recipe items
    const items = [...recipeShoppingItems]

    // Add selected staples
    if (!!stapleSelections && stapleSelections.length > 0) {
      const selectedStaples: ShoppingItem[] = stapleSelections
      .filter(staple => staple.status === StapleStatus.INCLUDED)
      .map(staple => ({
        itemName: staple.item.name,
        amounts: staple.item.staple_amount ? [staple.item.staple_amount] : [],
        recipeCount: 0, // Indicates this is a staple
        isStaple: true,
        orderIndex: orderLookup.get(staple.item.name)
      }))

      items.push(...selectedStaples)
    }

    // Add ad-hoc items
    const adHocDisplayItems: ShoppingItem[] = adHocItems.map(adhocItem => ({
      itemName: adhocItem.item.name,
      amounts: adhocItem.amount ? [adhocItem.amount] : [],
      recipeCount: 0, // Indicates this is ad-hoc
      isAdHoc: true,
      orderIndex: orderLookup.get(adhocItem.item.name)
    }))

    return [...items, ...adHocDisplayItems]
  }, [recipeShoppingItems, stapleSelections, adHocItems, orderLookup])

  // Sort items based on selected mode
  const sortedItems = useMemo(() => {
    if (sortMode === 'alphabetical') {
      return [...allShoppingItems].sort((a, b) => a.itemName.localeCompare(b.itemName))
    }

    // Store order mode
    const orderedItems = allShoppingItems
      .filter(item => item.orderIndex !== null && item.orderIndex !== undefined)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    
    const unorderedItems = allShoppingItems
      .filter(item => item.orderIndex === null || item.orderIndex === undefined)
      .sort((a, b) => a.itemName.localeCompare(b.itemName))

    return [...orderedItems, ...unorderedItems]
  }, [allShoppingItems, sortMode])

  // Check for unpositioned items (only relevant for store order mode)
  const unpositionedItems = sortedItems.filter(item => 
    item.orderIndex === null || item.orderIndex === undefined
  )

  // Format item display text
  const formatItem = (item: ShoppingItem) => {
    if (item.isStaple) {
      return item.amounts.length > 0 ? `${item.itemName}: ${item.amounts[0]}` : item.itemName
    }

    if (item.isAdHoc) {
      return item.amounts.length > 0 ? `${item.itemName}: ${item.amounts[0]}` : item.itemName
    }

    if (item.amounts.length === 0) {
      return `${item.itemName} (${item.recipeCount} recipe${item.recipeCount > 1 ? 's' : ''})`
    }
    
    const amountText = item.amounts.join(', ')
    const otherRecipes = item.recipeCount - item.amounts.length
    
    if (otherRecipes > 0) {
      return `${item.itemName}: ${amountText} (+ ${otherRecipes} other recipe${otherRecipes > 1 ? 's' : ''})`
    }
    
    return `${item.itemName}: ${amountText} (${item.recipeCount} recipe${item.recipeCount > 1 ? 's' : ''})`
  }

  // Event handlers
  const handleExclusionToggle = (itemName: string) => {
    const itemId = allItems.find(item => item.name === itemName)?.id
    if (!itemId) return

    const existingExclusion = excludedItems?.find(exclusion => exclusion.item.name === itemName)

    if (existingExclusion) {
      onUnexcludeItem?.(existingExclusion)
    } else {
      onExcludeItem?.(itemId)
    }
  }

  const handleAddAdHocItem = () => {
    if (newItemName.trim() && onAddAdHocItem) {
      onAddAdHocItem(newItemName.trim(), newItemAmount.trim() || '')
      setNewItemName('')
      setNewItemAmount('')
    }
  }

  const handleRemoveAdHocItem = (itemName: string) => {
    if (onRemoveAdHocItem) {
      const adhocItem = adHocItems.find(item => item.item.name === itemName)
      if (adhocItem) {
        onRemoveAdHocItem(adhocItem)
      }
    }
  }

  return (
    <Card>
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>Shopping List</Title>
        <SegmentedControl
          size="xs"
          value={sortMode}
          onChange={(value) => setSortMode(value as 'store' | 'alphabetical')}
          data={[
            { label: 'Store Order', value: 'store' },
            { label: 'A-Z', value: 'alphabetical' }
          ]}
        />
      </Group>
      
      {/* Warning for unpositioned items (only show in store order mode) */}
      {sortMode === 'store' && unpositionedItems.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" mb="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" fw={500}>Items need positioning</Text>
              <Text size="xs">
                {unpositionedItems.length} item{unpositionedItems.length > 1 ? 's' : ''} don&apos;t have store positions yet
              </Text>
            </div>
            <Button size="xs" component={Link} href="/store-order">
              Set Order
            </Button>
          </Group>
        </Alert>
      )}
      
      {sortedItems.length === 0 ? (
        <Text c="dimmed">Select recipes to generate shopping list</Text>
      ) : (
        <Stack gap="xs">
          {sortedItems.map((item, index) => {
            const isExcluded = excludedItems?.some(exclusion => exclusion.item.name === item.itemName) || false
            const isAdHoc = item.isAdHoc
            
            return (
              <Group key={`${item.itemName}-${index}`} justify="space-between" align="flex-start">
                <Text 
                  size="sm" 
                  style={{ 
                    flex: 1,
                    textDecoration: isExcluded ? 'line-through' : 'none',
                    opacity: isExcluded ? 0.6 : 1
                  }}
                >
                  {formatItem(item)}
                </Text>
                <Group gap="xs" w={60} justify="flex-start">
                  <Checkbox
                    size="sm"
                    checked={isExcluded}
                    onChange={() => handleExclusionToggle(item.itemName)}
                    aria-label={`Exclude ${item.itemName}`}
                  />
                  {isAdHoc ? (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemoveAdHocItem(item.itemName)}
                      aria-label={`Remove ${item.itemName}`}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  ) : (
                    <></>
                  )}
                </Group>
              </Group>
            )
          })}
        </Stack>
      )}

      {/* Add ad-hoc item form */}
      <Stack gap="xs" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
        <Text size="sm" fw={500}>Add Item</Text>
        <Group align="flex-end">
          <ItemAutocomplete
            placeholder="Item name"
            style={{ flex: 2 }}
            value={newItemName}
            onChange={(value) => setNewItemName(value)}
            size="sm"
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
            onClick={handleAddAdHocItem}
            leftSection={<IconPlus size={14} />}
            disabled={!newItemName.trim()}
          >
            Add
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}
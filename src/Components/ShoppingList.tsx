// src/Components/ShoppingList.tsx
'use client'

import { useMemo, useState } from 'react'
import { Card, Title, Text, Stack, Checkbox, Group, TextInput, Button, ActionIcon } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { Recipe } from '@/lib/types'

interface AdHocItem {
  item: string
  amount?: string
}

interface ShoppingListProps {
  recipes: Recipe[]
  excludedItems?: Set<string>
  onToggleExclusion?: (itemName: string) => void
  adHocItems?: AdHocItem[]
  onAddAdHocItem?: (item: string, amount?: string) => void
  onRemoveAdHocItem?: (index: number) => void
}

interface ShoppingItem {
  itemName: string
  amounts: string[]
  recipeCount: number
  isAdHoc?: boolean
}

export function ShoppingList({ 
  recipes, 
  excludedItems = new Set(), 
  onToggleExclusion,
  adHocItems = [],
  onAddAdHocItem,
  onRemoveAdHocItem 
}: ShoppingListProps) {
  // State for adding new ad-hoc items
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')

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
            recipeCount: 1
          })
        }
      })
    })

    return Array.from(itemMap.values())
  }, [recipes])

  // Combine recipe items and ad-hoc items for display
  const allItems = useMemo(() => {
    // Add ad-hoc items
    const adHocDisplayItems: ShoppingItem[] = adHocItems.map(item => ({
      itemName: item.item,
      amounts: item.amount ? [item.amount] : [],
      recipeCount: 0, // Indicates this is ad-hoc
      isAdHoc: true
    }))

    return [...recipeShoppingItems, ...adHocDisplayItems]
      .sort((a, b) => a.itemName.localeCompare(b.itemName))
  }, [recipeShoppingItems, adHocItems])

  // Format item display text
  const formatItem = (item: ShoppingItem) => {
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
    if (onToggleExclusion) {
      onToggleExclusion(itemName)
    }
  }

  const handleAddAdHocItem = () => {
    if (newItemName.trim() && onAddAdHocItem) {
      onAddAdHocItem(newItemName.trim(), newItemAmount.trim() || undefined)
      setNewItemName('')
      setNewItemAmount('')
    }
  }

  const handleRemoveAdHocItem = (itemName: string) => {
    if (onRemoveAdHocItem) {
      const index = adHocItems.findIndex(item => item.item === itemName)
      if (index !== -1) {
        onRemoveAdHocItem(index)
      }
    }
  }

  return (
    <Card>
      <Title order={3} mb="md">Shopping List</Title>
      
      {allItems.length === 0 ? (
        <Text c="dimmed">Select recipes to generate shopping list</Text>
      ) : (
        <Stack gap="xs">
          {allItems.map((item, index) => {
            const isExcluded = excludedItems.has(item.itemName)
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
          <TextInput
            placeholder="Item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            style={{ flex: 2 }}
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
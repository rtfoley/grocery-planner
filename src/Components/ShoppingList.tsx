// src/Components/ShoppingList.tsx
'use client'

import { useMemo, useState } from 'react'
import { Card, Title, Text, Stack, Checkbox, Group, TextInput, Button, ActionIcon, Alert, SegmentedControl } from '@mantine/core'
import { IconPlus, IconTrash, IconAlertCircle } from '@tabler/icons-react'
import { AdhocItemWithItem, ItemExclusionWithItem, MealWithDetails, RecipeWithItems, StapleSelectionWithItem, Item, StapleStatusEnum } from '@/lib/types'
import { ItemAutocomplete } from './ItemAutocomplete'
import Link from 'next/link'

interface ShoppingListProps {
  recipes: RecipeWithItems[]
  excludedItems?: ItemExclusionWithItem[]
  onExcludeItem?: (itemId: string) => void
  onUnexcludeItem?: (itemExclusion: ItemExclusionWithItem) => void
  adHocItems?: AdhocItemWithItem[]
  onAddAdHocItem?: (itemName: string, amount: string) => void
  onUpdateAdhocItem?: (updatedItem: AdhocItemWithItem) => void
  onRemoveAdHocItem?: (removedItem: AdhocItemWithItem) => void
  meals?: MealWithDetails[]
  stapleSelections?: StapleSelectionWithItem[]
  allItems?: Item[]
}

interface ShoppingItem {
  itemName: string
  amounts: string[]
  recipeCount: number
  isAdHoc?: boolean
  isSide?: boolean
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
  meals = [],
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

  // Combine recipe items, ad-hoc items, meal side items, and selected staples for display
  const allShoppingItems = useMemo(() => {
    // Start with recipe items
    const items = [...recipeShoppingItems]

    // Add selected staples
    if (!!stapleSelections && stapleSelections.length > 0) {
      const selectedStaples: ShoppingItem[] = stapleSelections
      .filter(staple => staple.status === StapleStatusEnum.INCLUDED)
      .map(staple => ({
        itemName: staple.item.name,
        amounts: staple.item.staple_amount ? [staple.item.staple_amount] : [],
        recipeCount: 0, // Indicates this is a staple
        isStaple: true,
        orderIndex: orderLookup.get(staple.item.name)
      }))

      items.forEach((item) => {
        if(selectedStaples.find(x => x.itemName === item.itemName))
        {
          item.isStaple = true;
        }
      })

      const deduplicatedStaples = selectedStaples.filter(staple => !items.find(x => x.itemName === staple.itemName));
      items.push(...deduplicatedStaples)
    }

    // Add meal items from meals
    const mealItemsFlattened = meals.flatMap(meal => meal.meal_items || []);
    const mealDisplayItems: ShoppingItem[] = mealItemsFlattened.map(mealItem => ({
      itemName: mealItem.item.name,
      amounts: mealItem.amount ? [mealItem.amount] : [],
      recipeCount: 0, // Indicates this is a meal item
      isSide: true,
      orderIndex: orderLookup.get(mealItem.item.name)
    }))

    items.forEach((item) => {
      if(mealDisplayItems.find(x => x.itemName === item.itemName))
      {
        item.isSide = true;
      }
    })

    const deduplicatedMealItems = mealDisplayItems.filter(mealItem => !items.find(x => x.itemName === mealItem.itemName));
    items.push(...deduplicatedMealItems)

    // Add ad-hoc items
    const adHocDisplayItems: ShoppingItem[] = adHocItems.map(adhocItem => ({
      itemName: adhocItem.item.name,
      amounts: adhocItem.amount ? [adhocItem.amount] : [],
      recipeCount: 0, // Indicates this is ad-hoc
      isAdHoc: true,
      orderIndex: orderLookup.get(adhocItem.item.name)
    }))

    return [...items, ...adHocDisplayItems]
  }, [recipeShoppingItems, stapleSelections, meals, adHocItems, orderLookup])

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
  //// TODO turn into helper, add unit tests
  const formatItem = (item: ShoppingItem) => {
    // Handle simple cases first
    if (item.isStaple && item.recipeCount === 0 && !item.isSide) {
      return item.amounts.length > 0 ? `${item.itemName}: ${item.amounts[0]}` : item.itemName;
    }

    if (item.isSide && item.recipeCount === 0 && !item.isStaple) {
      return item.amounts.length > 0 ? `${item.itemName}: ${item.amounts[0]}` : item.itemName;
    }

    if (item.isAdHoc) {
      return item.amounts.length > 0 ? `${item.itemName}: ${item.amounts[0]}` : item.itemName;
    }

    // Recipe items
    const amountText = item.amounts.join(', ');
    const otherRecipes = item.recipeCount - item.amounts.length;
    const flags = [];
    if (item.isStaple) flags.push('staple');
    if (item.isSide) flags.push('side');
    const flagText = flags.length > 0 ? ', ' + flags.join(', ') : '';

    if (amountText && otherRecipes > 0) {
      return `${item.itemName}: ${amountText} (+ ${otherRecipes} other recipe${otherRecipes > 1 ? 's' : ''}${flagText})`;
    } else if (amountText) {
      return `${item.itemName}: ${amountText} (${item.recipeCount} recipe${item.recipeCount > 1 ? 's' : ''}${flagText})`;
    } else {
      return `${item.itemName} (${item.recipeCount} recipe${item.recipeCount > 1 ? 's' : ''}${flagText})`;
    }
  };

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

  const shareViaShortcuts = (groceryItems: ShoppingItem[]): void => {
      // Create set of excluded names for O(1) lookup
    const excludedNames = new Set(excludedItems?.map(item => item.item.name.toLowerCase())) || [];
    
    // Filter out excluded items
    const includedItems = groceryItems.filter(item => !excludedNames.has(item.itemName.toLowerCase()));
    
    const itemsText = includedItems
      .map(item => formatItem(item))
      .join('\n');
    
    const encodedItems = encodeURIComponent(itemsText);
    const shortcutsURL = `shortcuts://run-shortcut?name=GroceryCheckboxes&input=text&text=${encodedItems}`;
    
    window.open(shortcutsURL, '_self');
  };

  return (
    <Card>
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>Shopping List</Title>
        <Group gap="xs">
          <SegmentedControl
            size="xs"
            value={sortMode}
            onChange={(value) => setSortMode(value as 'store' | 'alphabetical')}
            data={[
              { label: 'Store Order', value: 'store' },
              { label: 'A-Z', value: 'alphabetical' }
            ]}
          />
          <Button size="compact-sm" onClick={() => shareViaShortcuts(sortedItems)}>
            Share
          </Button>
        </Group>
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
            items={allItems.map(item => item.name)}
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
// src/components/ShoppingList.tsx
'use client'

import { useMemo } from 'react'
import { Card, Title, Text, Stack } from '@mantine/core'
import { Recipe } from '@/lib/types'

interface ShoppingListProps {
  recipes: Recipe[]
}

interface ShoppingItem {
  itemName: string
  amounts: string[]
  recipeCount: number
}

export function ShoppingList({ recipes }: ShoppingListProps) {
  const shoppingItems = useMemo(() => {
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

    return Array.from(itemMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName))
  }, [recipes])

  const formatItem = (item: ShoppingItem) => {
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

  return (
    <Card>
      <Title order={3} mb="md">Shopping List</Title>
      {shoppingItems.length === 0 ? (
        <Text c="dimmed">Select recipes to generate shopping list</Text>
      ) : (
        <Stack gap="xs">
          {shoppingItems.map(item => (
            <Text key={item.itemName} size="sm">
              {formatItem(item)}
            </Text>
          ))}
        </Stack>
      )}
    </Card>
  )
}
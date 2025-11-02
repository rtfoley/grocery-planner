// src/lib/shoppingListUtils.ts
import { MealWithDetails, StapleSelectionWithItem, AdhocItemWithItem, Item } from './types'

/**
 * Calculate all items needed for shopping based on meals, staples, and adhoc items
 * Does NOT filter out exclusions - caller can filter if needed
 * Returns a Map of item_id -> Item
 */
export function calculateNeededItems(
  meals: MealWithDetails[],
  staples: StapleSelectionWithItem[],
  adhocItems: AdhocItemWithItem[]
): Map<string, Item> {
  const itemMap = new Map<string, Item>()

  // Add items from meals (recipes + individual meal items)
  meals.forEach(meal => {
    meal.meal_recipes?.forEach(mr => {
      mr.recipe.recipe_items?.forEach(ri => {
        itemMap.set(ri.item.id, ri.item)
      })
    })
    meal.meal_items?.forEach(mi => {
      itemMap.set(mi.item.id, mi.item)
    })
  })

  // Add included staples
  staples.forEach(staple => {
    if (staple.status === 'INCLUDED') {
      itemMap.set(staple.item_id, staple.item)
    }
  })

  // Add adhoc items
  adhocItems.forEach(adhoc => {
    itemMap.set(adhoc.item_id, adhoc.item)
  })

  return itemMap
}

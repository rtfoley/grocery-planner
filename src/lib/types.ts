// src/lib/types.ts

import { Database } from './database.types'

// Helper types from Supabase schema
type Tables = Database['public']['Tables']

export type Item = Tables['items']['Row']
export type Recipe = Tables['recipes']['Row']
export type PlanningSession = Tables['planning_sessions']['Row']
export type MealAssignment = Tables['meal_assignments']['Row']
export type StapleSelection = Tables['staple_selections']['Row']
export type AdhocItem = Tables['adhoc_items']['Row']
export type ItemExclusion = Tables['item_exclusions']['Row']
export type RecipeItem = Tables['recipe_items']['Row']

// Composite types with relations
export type MealAssignmentWithRecipe = MealAssignment & {
  recipe: Recipe | null
}

export type RecipeWithItems = Recipe & {
  recipe_items: Array<{
    amount: string | null
    item: Item
  }>
}

export type StapleSelectionWithItem = StapleSelection & {
  item: Item
}

export type ItemExclusionWithItem = ItemExclusion & {
  item: Item
}

export type AdhocItemWithItem = AdhocItem & {
  item: Item
}

// Enum types
export type StapleStatus = Database['public']['Enums']['staple_status']

// Runtime enum values (for use in code)
export const StapleStatusEnum = {
  PENDING: 'PENDING' as StapleStatus,
  INCLUDED: 'INCLUDED' as StapleStatus,
  EXCLUDED: 'EXCLUDED' as StapleStatus,
} as const

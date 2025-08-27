// src/lib/types.ts

export interface Recipe {
  id: number
  name: string
  recipe_items: Array<{
    item: { name: string }
    amount: string | null
  }>
}

export interface Item {
  id: number
  name: string
  is_staple: boolean
  staple_amount: string | null
  store_order_index: number | null
}

export interface MealAssignment {
  date: Date
  recipeId: number | null
}
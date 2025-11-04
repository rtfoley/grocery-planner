'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from './database.types'
import { logError } from './errorLogger'

type StapleStatus = Database['public']['Enums']['staple_status']

// Helper to get current user's group ID
async function getUserGroupId(): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('shopping_group_members')
    .select('shopping_group_id')
    .eq('user_id', user.id)
    .single()

  return data?.shopping_group_id || null
}

// Item actions
export async function createItem(name: string, is_staple: boolean = false, staple_amount?: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const normalizedName = name.toLowerCase().trim()
  const supabase = await createClient()

  try {
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        name: normalizedName,
        is_staple,
        staple_amount: is_staple ? staple_amount || null : null,
        shopping_group_id: groupId
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/items')
    return { success: true, item }
  } catch (error) {
    logError(error, { action: 'createItem', itemName: normalizedName, groupId })
    return { success: false, error: 'Item already exists or invalid name' }
  }
}

export async function getItems() {
  const groupId = await getUserGroupId()
  if (!groupId) return []

  const supabase = await createClient()

  const { data } = await supabase
    .from('items')
    .select('*')
    .eq('shopping_group_id', groupId)
    .order('name', { ascending: true })

  return data || []
}

export async function updateItemStapleStatus(id: string, is_staple: boolean, staple_amount?: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    const { data: item, error } = await supabase
      .from('items')
      .update({
        is_staple,
        staple_amount: is_staple ? staple_amount || null : null
      })
      .eq('id', id)
      .eq('shopping_group_id', groupId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/items')
    return { success: true, item }
  } catch (error) {
    logError(error, { action: 'updateItemStapleStatus', itemId: id, is_staple, groupId })
    return { success: false, error: 'Failed to update staple status' }
  }
}

// Store ordering actions
export async function updateItemOrder(itemId: string, orderIndex: number) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    const { data: item, error } = await supabase
      .from('items')
      .update({ store_order_index: orderIndex })
      .eq('id', itemId)
      .eq('shopping_group_id', groupId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/store-order')
    return { success: true, item }
  } catch (error) {
    logError(error, { action: 'updateItemOrder', itemId, orderIndex, groupId })
    return { success: false, error: 'Failed to update item order' }
  }
}

export async function updateMultipleItemOrders(updates: Array<{ id: string, orderIndex: number | null }>) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    await Promise.all(
      updates.map(({ id, orderIndex }) =>
        supabase
          .from('items')
          .update({ store_order_index: orderIndex })
          .eq('id', id)
          .eq('shopping_group_id', groupId)
      )
    )

    revalidatePath('/store-order')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'updateMultipleItemOrders', updateCount: updates.length, groupId })
    return { success: false, error: 'Failed to update item orders' }
  }
}

// Recipe actions
export async function createRecipe(name: string, ingredients: Array<{ item: string, amount?: string }>) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name,
        shopping_group_id: groupId
      })
      .select()
      .single()

    if (recipeError) throw recipeError

    // Normalize all ingredient names
    const normalizedIngredients = ingredients.map(ing => ({
      name: ing.item.toLowerCase().trim(),
      amount: ing.amount || null
    }))

    const itemNames = normalizedIngredients.map(ing => ing.name)

    // Batch fetch all existing items in one query
    const { data: existingItems } = await supabase
      .from('items')
      .select('id, name')
      .eq('shopping_group_id', groupId)
      .in('name', itemNames)

    const existingItemMap = new Map(
      (existingItems || []).map(item => [item.name, item.id])
    )

    // Identify which items need to be created
    const itemsToCreate = normalizedIngredients
      .filter(ing => !existingItemMap.has(ing.name))
      .map(ing => ({
        name: ing.name,
        shopping_group_id: groupId
      }))

    // Batch create new items if any
    if (itemsToCreate.length > 0) {
      const { data: newItems } = await supabase
        .from('items')
        .insert(itemsToCreate)
        .select('id, name')

      // Add newly created items to the map
      newItems?.forEach(item => {
        existingItemMap.set(item.name, item.id)
      })
    }

    // Batch create all recipe_items
    const recipeItemsToCreate = normalizedIngredients.map(ing => ({
      recipe_id: recipe.id,
      item_id: existingItemMap.get(ing.name)!,
      amount: ing.amount
    }))

    await supabase
      .from('recipe_items')
      .insert(recipeItemsToCreate)

    // Fetch the complete recipe with items
    const { data: completeRecipe } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_items (
          amount,
          item:items (*)
        )
      `)
      .eq('id', recipe.id)
      .single()

    revalidatePath('/recipes')
    return { success: true, recipe: completeRecipe }
  } catch (error) {
    logError(error, { action: 'createRecipe', groupId })
    return { success: false, error: 'Failed to create recipe' }
  }
}

export async function updateRecipe(id: string, name: string, ingredients: Array<{ item: string, amount?: string }>) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    // Update recipe name
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ name })
      .eq('id', id)
      .eq('shopping_group_id', groupId)

    if (updateError) throw updateError

    // Get existing recipe items
    const { data: existingItems } = await supabase
      .from('recipe_items')
      .select('item_id, amount, item:items(name)')
      .eq('recipe_id', id)

    const existingMap = new Map(
      (existingItems || []).map(ri => {
        const itemData = ri.item as { name: string } | { name: string }[] | null
        const itemName = Array.isArray(itemData) ? itemData[0]?.name : itemData?.name
        return [
          itemName || '',
          { item_id: ri.item_id, amount: ri.amount }
        ]
      })
    )

    // Normalize all ingredient names
    const normalizedIngredients = ingredients.map(ing => ({
      name: ing.item.toLowerCase().trim(),
      amount: ing.amount || null
    }))

    const newItemNames = new Set(normalizedIngredients.map(ing => ing.name))

    // Separate ingredients into: existing (to update), new (to add)
    const toUpdate = normalizedIngredients.filter(ing => {
      const existing = existingMap.get(ing.name)
      return existing && existing.amount !== ing.amount
    })

    const toAdd = normalizedIngredients.filter(ing => !existingMap.has(ing.name))

    // Batch update amounts for existing items that changed
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map(ing => {
          const existing = existingMap.get(ing.name)!
          return supabase
            .from('recipe_items')
            .update({ amount: ing.amount })
            .eq('recipe_id', id)
            .eq('item_id', existing.item_id)
        })
      )
    }

    // Handle new items if any
    if (toAdd.length > 0) {
      const newItemNames = toAdd.map(ing => ing.name)

      // Batch fetch existing items
      const { data: existingItemsToAdd } = await supabase
        .from('items')
        .select('id, name')
        .eq('shopping_group_id', groupId)
        .in('name', newItemNames)

      const existingItemsToAddMap = new Map(
        (existingItemsToAdd || []).map(item => [item.name, item.id])
      )

      // Identify which items need to be created
      const itemsToCreate = toAdd
        .filter(ing => !existingItemsToAddMap.has(ing.name))
        .map(ing => ({
          name: ing.name,
          shopping_group_id: groupId
        }))

      // Batch create new items if any
      if (itemsToCreate.length > 0) {
        const { data: newItems } = await supabase
          .from('items')
          .insert(itemsToCreate)
          .select('id, name')

        newItems?.forEach(item => {
          existingItemsToAddMap.set(item.name, item.id)
        })
      }

      // Batch create recipe_items for new ingredients
      const recipeItemsToCreate = toAdd.map(ing => ({
        recipe_id: id,
        item_id: existingItemsToAddMap.get(ing.name)!,
        amount: ing.amount
      }))

      await supabase
        .from('recipe_items')
        .insert(recipeItemsToCreate)
    }

    // Delete items that are no longer in the recipe
    const itemsToDelete = Array.from(existingMap.keys())
      .filter(name => !newItemNames.has(name))
      .map(name => existingMap.get(name)!.item_id)

    if (itemsToDelete.length > 0) {
      await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', id)
        .in('item_id', itemsToDelete)
    }

    // Fetch the complete recipe with items
    const { data: completeRecipe } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_items (
          amount,
          item:items (*)
        )
      `)
      .eq('id', id)
      .single()

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${id}`)
    return { success: true, recipe: completeRecipe }
  } catch (error) {
    logError(error, { action: 'updateRecipe', recipeId: id, groupId })
    return { success: false, error: 'Failed to update recipe' }
  }
}

export async function deleteRecipe(id: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('shopping_group_id', groupId)

    if (error) throw error

    revalidatePath('/recipes')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'deleteRecipe', recipeId: id, groupId })
    return { success: false, error: 'Failed to delete recipe' }
  }
}

export async function getRecipes() {
  const groupId = await getUserGroupId()
  if (!groupId) return []

  const supabase = await createClient()

  const { data } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_items (
        amount,
        item:items (*)
      )
    `)
    .eq('shopping_group_id', groupId)
    .order('name', { ascending: true })

  return data || []
}

export async function getRecipe(id: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return null

  const supabase = await createClient()

  const { data } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_items (
        amount,
        item:items (*)
      )
    `)
    .eq('id', id)
    .eq('shopping_group_id', groupId)
    .single()

  return data || null
}

// Planning session actions
export async function createPlanningSession(startDate: string, endDate: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('planning_sessions')
      .insert({
        start_date: startDate,
        end_date: endDate,
        shopping_group_id: groupId
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, session: data }
  } catch (error) {
    logError(error, { action: 'createPlanningSession', groupId, startDate, endDate })
    return { success: false, error: 'Failed to create planning session' }
  }
}

// Get all planning sessions for the group
export async function getPlanningSessions() {
  const groupId = await getUserGroupId()
  if (!groupId) return []

  const supabase = await createClient()

  const { data } = await supabase
    .from('planning_sessions')
    .select('*')
    .eq('shopping_group_id', groupId)
    .order('start_date', { ascending: false })

  return data || []
}

// Get a specific planning session by ID
export async function getPlanningSession(sessionId: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return null

  const supabase = await createClient()

  const { data } = await supabase
    .from('planning_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('shopping_group_id', groupId)
    .single()

  return data || null
}

// Staple selection actions
export async function createStapleSelection(planningSessionId: string, itemId: string, status: StapleStatus) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('staple_selections')
    .insert({
      planning_session_id: planningSessionId,
      item_id: itemId,
      status: status
    })
    .select(`
      *,
      item:items (*)
    `)
    .single()

  return data || null
}

export async function getStapleSelections(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('staple_selections')
    .select(`
      *,
      item:items (*)
    `)
    .eq('planning_session_id', planningSessionId)

  return data || []
}

export async function updateStapleSelection(planningSessionId: string, itemId: string, status: StapleStatus) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('staple_selections')
    .update({ status })
    .eq('planning_session_id', planningSessionId)
    .eq('item_id', itemId)
    .select()
    .single()

  return data || null
}

// Ad-hoc item actions
export async function createAdhocItem(planningSessionId: string, itemName: string, amount: string | null) {
  const groupId = await getUserGroupId()
  if (!groupId) return null

  const supabase = await createClient()
  const normalizedName = itemName.toLowerCase().trim()

  // Try to get existing item
  let { data: item } = await supabase
    .from('items')
    .select('id')
    .eq('name', normalizedName)
    .eq('shopping_group_id', groupId)
    .single()

  // Create item if it doesn't exist
  if (!item) {
    const { data: newItem } = await supabase
      .from('items')
      .insert({
        name: normalizedName,
        shopping_group_id: groupId
      })
      .select('id')
      .single()

    item = newItem
  }

  if (!item) return null

  const { data } = await supabase
    .from('adhoc_items')
    .insert({
      planning_session_id: planningSessionId,
      item_id: item.id,
      amount: amount
    })
    .select(`
      *,
      item:items (*)
    `)
    .single()

  return data || null
}

export async function getAdhocItems(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('adhoc_items')
    .select(`
      *,
      item:items (*)
    `)
    .eq('planning_session_id', planningSessionId)

  return data || []
}

export async function updateAdhocItem(planningSessionId: string, itemId: string, amount: string | null) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('adhoc_items')
    .update({ amount })
    .eq('planning_session_id', planningSessionId)
    .eq('item_id', itemId)
    .select()
    .single()

  return data || null
}

export async function deleteAdhocItem(planningSessionId: string, itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('adhoc_items')
    .delete()
    .eq('planning_session_id', planningSessionId)
    .eq('item_id', itemId)

  return { success: !error }
}

// Item exclusion actions
export async function addItemExclusion(planningSessionId: string, itemId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('item_exclusions')
    .insert({
      planning_session_id: planningSessionId,
      item_id: itemId
    })
    .select(`
      *,
      item:items (*)
    `)
    .single()

  return data || null
}

export async function getItemExclusions(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('item_exclusions')
    .select(`
      *,
      item:items (*)
    `)
    .eq('planning_session_id', planningSessionId)

  return data || []
}

export async function deleteItemExclusion(planningSessionId: string, itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('item_exclusions')
    .delete()
    .eq('planning_session_id', planningSessionId)
    .eq('item_id', itemId)

  return { success: !error }
}

// ============================================================================
// MEAL-CENTRIC ACTIONS
// ============================================================================

// Meal actions
export async function createMeal(planningSessionId: string, date: string | null, name?: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meals')
    .insert({
      planning_session_id: planningSessionId,
      date: date,
      name: name || null
    })
    .select()
    .single()

  return data || null
}

export async function getMeal(mealId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meals')
    .select(`
      *,
      meal_recipes (
        id,
        recipe:recipes (
          *,
          recipe_items (
            amount,
            item:items (*)
          )
        )
      ),
      meal_items (
        id,
        amount,
        item:items (*)
      )
    `)
    .eq('id', mealId)
    .single()

  return data || null
}

export async function getMeals(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meals')
    .select(`
      *,
      meal_recipes (
        id,
        recipe:recipes (
          *,
          recipe_items (
            amount,
            item:items (*)
          )
        )
      ),
      meal_items (
        id,
        amount,
        item:items (*)
      )
    `)
    .eq('planning_session_id', planningSessionId)
    .order('date', { ascending: true, nullsFirst: false })

  return data || []
}

export async function updateMeal(mealId: string, updates: { name?: string, date?: string | null }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meals')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single()

  return data || null
}

export async function deleteMeal(mealId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId)

  return { success: !error }
}

// Meal recipe actions
export async function addRecipeToMeal(mealId: string, recipeId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_recipes')
    .insert({
      meal_id: mealId,
      recipe_id: recipeId
    })
    .select()
    .single()

  return data || null
}

export async function removeRecipeFromMeal(mealRecipeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_recipes')
    .delete()
    .eq('id', mealRecipeId)

  return { success: !error }
}

// Meal item actions
export async function addItemToMeal(mealId: string, itemId: string, amount: string | null) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_items')
    .insert({
      meal_id: mealId,
      item_id: itemId,
      amount: amount
    })
    .select(`
      *,
      item:items (*)
    `)
    .single()

  return data || null
}

export async function updateMealItem(mealItemId: string, amount: string | null) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_items')
    .update({ amount })
    .eq('id', mealItemId)
    .select()
    .single()

  return data || null
}

export async function removeMealItem(mealItemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_items')
    .delete()
    .eq('id', mealItemId)

  return { success: !error }
}

// ============================================================================
// SHOPPING LIST ACTIONS
// ============================================================================

// Get shopping list items for a session (with item details)
export async function getShoppingListItems(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('shopping_list_items')
    .select(`
      *,
      item:items (*)
    `)
    .eq('planning_session_id', planningSessionId)
    .order('checked', { ascending: true })

  return data || []
}


// Add item to shopping list by name (creates item if needed)
export async function addShoppingListItemByName(planningSessionId: string, itemName: string) {
  const groupId = await getUserGroupId()
  if (!groupId) return null

  const supabase = await createClient()
  const normalizedName = itemName.toLowerCase().trim()

  // Try to get existing item
  let { data: item } = await supabase
    .from('items')
    .select('id')
    .eq('name', normalizedName)
    .eq('shopping_group_id', groupId)
    .single()

  // Create item if it doesn't exist
  if (!item) {
    const { data: newItem } = await supabase
      .from('items')
      .insert({
        name: normalizedName,
        shopping_group_id: groupId
      })
      .select('id')
      .single()

    item = newItem
  }

  if (!item) return null

  // Add to shopping list
  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      planning_session_id: planningSessionId,
      item_id: item.id,
      checked: false
    })
    .select(`
      *,
      item:items (*)
    `)
    .single()

  if (error) {
    logError(error, { action: 'addShoppingListItem', planningSessionId, itemName: normalizedName, groupId })
    return null
  }

  // Don't revalidate - client component handles optimistic updates
  return data
}

// Toggle a single item's checked status (upsert so it creates if doesn't exist)
export async function toggleShoppingListItem(
  planningSessionId: string,
  itemId: string,
  checked: boolean
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shopping_list_items')
    .upsert({
      planning_session_id: planningSessionId,
      item_id: itemId,
      checked: checked,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'planning_session_id,item_id'
    })
    .select(`
      *,
      item:items (*)
    `)
    .single()

  if (error) {
    logError(error, { action: 'toggleShoppingListItem', planningSessionId, itemId, checked })
    return null
  }

  // Don't revalidate - client component handles optimistic updates
  return data
}


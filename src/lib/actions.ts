'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from './database.types'

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
    return { success: false, error: 'Failed to update item order' }
  }
}

export async function updateMultipleItemOrders(updates: Array<{ id: string, orderIndex: number }>) {
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

    // Create or get items and create recipe_items
    for (const ing of ingredients) {
      const normalizedName = ing.item.toLowerCase().trim()

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

      if (item) {
        // Create recipe_item
        await supabase
          .from('recipe_items')
          .insert({
            recipe_id: recipe.id,
            item_id: item.id,
            amount: ing.amount || null
          })
      }
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
      .eq('id', recipe.id)
      .single()

    revalidatePath('/recipes')
    return { success: true, recipe: completeRecipe }
  } catch (error) {
    console.error('Create recipe error:', error)
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
      (existingItems || []).map(ri => [
        (ri.item as any).name,
        { item_id: ri.item_id, amount: ri.amount }
      ])
    )

    // Process new ingredients
    const newItemNames = new Set<string>()
    for (const ing of ingredients) {
      const normalizedName = ing.item.toLowerCase().trim()
      newItemNames.add(normalizedName)

      const existing = existingMap.get(normalizedName)

      if (existing) {
        // Item exists - check if amount changed
        if (existing.amount !== (ing.amount || null)) {
          await supabase
            .from('recipe_items')
            .update({ amount: ing.amount || null })
            .eq('recipe_id', id)
            .eq('item_id', existing.item_id)
        }
      } else {
        // New item - need to add it
        let { data: item } = await supabase
          .from('items')
          .select('id')
          .eq('name', normalizedName)
          .eq('shopping_group_id', groupId)
          .single()

        if (!item) {
          const { data: newItem } = await supabase
            .from('items')
            .insert({ name: normalizedName, shopping_group_id: groupId })
            .select('id')
            .single()
          item = newItem
        }

        if (item) {
          await supabase
            .from('recipe_items')
            .insert({
              recipe_id: id,
              item_id: item.id,
              amount: ing.amount || null
            })
        }
      }
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
    console.error('Update recipe error:', error)
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
  if (!groupId) return null

  const supabase = await createClient()

  const { data } = await supabase
    .from('planning_sessions')
    .insert({
      start_date: startDate,
      end_date: endDate,
      shopping_group_id: groupId
    })
    .select()
    .single()

  return data || null
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

// Meal assignment actions
export async function createMealAssignment(planningSessionId: string, recipeId: string | null, date: string | null) {
  const groupId = await getUserGroupId()
  if (!groupId) return null

  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_assignments')
    .insert({
      planning_session_id: planningSessionId,
      recipe_id: recipeId,
      date: date
    })
    .select(`
      *,
      recipe:recipes (*)
    `)
    .single()

  return data || null
}

export async function getMealAssignments(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_assignments')
    .select(`
      *,
      recipe:recipes (*)
    `)
    .eq('planning_session_id', planningSessionId)

  return data || []
}

export async function updateMealAssignment(assignmentId: string, recipeId: string | null) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_assignments')
    .update({ recipe_id: recipeId })
    .eq('id', assignmentId)
    .select()
    .single()

  return data || null
}

export async function deleteMealAssignment(assignmentId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_assignments')
    .delete()
    .eq('id', assignmentId)

  return { success: !error }
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

// Meal side item actions
export async function createMealSideItem(planningSessionId: string, date: string | null, itemId: string, amount: string | null) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_side_items')
    .insert({
      planning_session_id: planningSessionId,
      date: date,
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

export async function getMealSideItems(planningSessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_side_items')
    .select(`
      *,
      item:items (*)
    `)
    .eq('planning_session_id', planningSessionId)

  return data || []
}

export async function updateMealSideItem(sideItemId: string, amount: string | null) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('meal_side_items')
    .update({ amount })
    .eq('id', sideItemId)
    .select()
    .single()

  return data || null
}

export async function deleteMealSideItem(sideItemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('meal_side_items')
    .delete()
    .eq('id', sideItemId)

  return { success: !error }
}

'use server'

import { prisma } from '@/lib/prisma'
import { PlanningSession, StapleStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { MealAssignmentWithRecipe, RecipeWithItems, StapleSelectionWithItem } from './types'

// Item actions
export async function createItem(name: string, is_staple: boolean = false, staple_amount?: string) {
  const normalizedName = name.toLowerCase().trim()
  
  try {
    const item = await prisma.item.create({
      data: { 
        name: normalizedName,
        is_staple,
        staple_amount: is_staple ? staple_amount || null : null
      }
    })
    
    revalidatePath('/items')
    return { success: true, item }
  } catch (error) {
    return { success: false, error: 'Item already exists or invalid name' }
  }
}

export async function getItems() {
  return await prisma.item.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function updateItemStapleStatus(id: number, is_staple: boolean, staple_amount?: string) {
  try {
    const item = await prisma.item.update({
      where: { id },
      data: { 
        is_staple,
        staple_amount: is_staple ? staple_amount || null : null
      }
    })
    
    revalidatePath('/items')
    return { success: true, item }
  } catch (error) {
    return { success: false, error: 'Failed to update staple status' }
  }
}

// Store ordering actions
export async function updateItemOrder(itemId: number, orderIndex: number) {
  try {
    const item = await prisma.item.update({
      where: { id: itemId },
      data: { store_order_index: orderIndex }
    })
    
    revalidatePath('/store-order')
    return { success: true, item }
  } catch (error) {
    return { success: false, error: 'Failed to update item order' }
  }
}

export async function updateMultipleItemOrders(updates: Array<{ id: number, orderIndex: number }>) {
  try {
    await Promise.all(
      updates.map(({ id, orderIndex }) =>
        prisma.item.update({
          where: { id },
          data: { store_order_index: orderIndex }
        })
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
  try {
    const recipe = await prisma.recipe.create({
      data: {
        name,
        recipe_items: {
          create: ingredients.map(ing => ({
            amount: ing.amount || null,
            item: {
              connectOrCreate: {
                where: { name: ing.item.toLowerCase().trim() },
                create: { name: ing.item.toLowerCase().trim() }
              }
            }
          }))
        }
      },
      include: {
        recipe_items: {
          include: { item: true }
        }
      }
    })
    
    revalidatePath('/recipes')
    return { success: true, recipe }
  } catch (error) {
    return { success: false, error: 'Failed to create recipe' }
  }
}

export async function updateRecipe(id: number, name: string, ingredients: Array<{ item: string, amount?: string }>) {
  try {
    // Delete existing recipe items and create new ones
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name,
        recipe_items: {
          deleteMany: {},
          create: ingredients.map(ing => ({
            amount: ing.amount || null,
            item: {
              connectOrCreate: {
                where: { name: ing.item.toLowerCase().trim() },
                create: { name: ing.item.toLowerCase().trim() }
              }
            }
          }))
        }
      },
      include: {
        recipe_items: {
          include: { item: true }
        }
      }
    })
    
    revalidatePath('/recipes')
    revalidatePath(`/recipes/${id}`)
    return { success: true, recipe }
  } catch (error) {
    return { success: false, error: 'Failed to update recipe' }
  }
}

export async function deleteRecipe(id: number) {
  try {
    await prisma.recipe.delete({
      where: { id }
    })
    
    revalidatePath('/recipes')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete recipe' }
  }
}

export async function getRecipes(): Promise<RecipeWithItems[]> {
  return await prisma.recipe.findMany({
    include: {
      recipe_items: {
        include: { item: true }
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function getRecipe(id: number): Promise<RecipeWithItems | null> {
  return await prisma.recipe.findUnique({
    where: { id },
    include: {
      recipe_items: {
        include: { item: true }
      }
    }
  })
}

export async function createPlanningSession(startDate: Date) {
  return await prisma.planningSession.create({
    data: {
      start_date: startDate
    }
  });
}

export async function getActivePlanningSession(): Promise<PlanningSession | null> {
  return await prisma.planningSession.findFirst({
    orderBy: {
      id: 'desc'
    },
  })
}

export async function createMealAssignment(planningSessionId: number, recipeId: number | null, date: Date): Promise<MealAssignmentWithRecipe> {
  return await prisma.mealAssignment.create({
    data: {
      planning_session_id: planningSessionId,
      recipe_id: recipeId,
      date: date
    },
    include:
    {
      recipe: true
    }
  });
}

export async function getMealAssignments(planningSessionId: number) : Promise<MealAssignmentWithRecipe[]>
{
  return await prisma.mealAssignment.findMany({
    where: {
      planning_session_id: planningSessionId
    },
    include: {
      recipe: true
    }
  });
}

export async function updateMealAssignment(planningSessionId: number, recipeId: number | null, date: Date) {
  return await prisma.mealAssignment.update({
    where: {
      planning_session_id_date: {
        planning_session_id: planningSessionId, 
        date: date,
      }
    },
    data: {
      recipe_id: recipeId
    } 
  });
}

export async function createStapleSelection(planningSessionId: number, itemId: number, status: StapleStatus): Promise<StapleSelectionWithItem> {
  return await prisma.stapleSelection.create({
    data: {
      planning_session_id: planningSessionId,
      item_id: itemId,
      status: status
    },
    include: {
      item: true
    }
  });
}

export async function getStapleSelections(planningSessionId: number): Promise<StapleSelectionWithItem[]> {
  return await prisma.stapleSelection.findMany({
    where: {
      planning_session_id: planningSessionId
    },
    include: {
      item: true
    }
  });
}

export async function updateStapleSelection(planningSessionId: number, itemId: number, status: StapleStatus) {
  return await prisma.stapleSelection.update({
    where: {
      planning_session_id_item_id: {
        planning_session_id: planningSessionId,
        item_id: itemId
      },
      
    },
    data: {
      status: status
    }
  })
}

// TODO adhoc items
export async function createAdhocItem(planningSessionId: number, itemName: string, amount: string | null) {
  // First, get or create the item
  const item = await prisma.item.upsert({
    where: { name: itemName.toLowerCase().trim() },
    create: { name: itemName.toLowerCase().trim() },
    update: {}
  });

  // Then create the adhoc item using the item_id
  return await prisma.adhocItem.create({
    data: {
      planning_session_id: planningSessionId,
      item_id: item.id,  // Use the foreign key directly
      amount: amount
    },
    include: {
      item: true
    }
  });
}

export async function getAdhocItems(planningSessionId: number) {
  return await prisma.adhocItem.findMany({
    where: {
      planning_session_id: planningSessionId
    },
    include: {
      item: true
    }
  });
}

export async function updateAdhocItem(planningSessionId: number, itemId: number, amount: string | null)
{
  return await prisma.adhocItem.update({
    where: {
      planning_session_id_item_id: {
        planning_session_id: planningSessionId,
        item_id: itemId
      }
    },
    data: {
      amount: amount
    }
  })
}

export async function deleteAdhocItem(planningSessionId: number, itemId: number)
{
  return await prisma.adhocItem.delete({
    where: {
      planning_session_id_item_id: {
        planning_session_id: planningSessionId,
        item_id: itemId
      }
    }
  })
}

// item exclusions
export async function addItemExclusion(planningSessionId: number, itemId: number)
{
  return await prisma.itemExclusion.create({
    data: {
      planning_session_id: planningSessionId,
      item_id: itemId
    },
    include: {
      item: true
    }
  });
}

export async function getItemExclusions(planningSessionId: number) {
  return await prisma.itemExclusion.findMany({
    where: {
      planning_session_id: planningSessionId
    },
    include: {
      item: true
    }
  });
}

export async function deleteItemExclusion(planningSessionId: number, itemId: number)
{
  return await prisma.itemExclusion.delete({
    where: {
      planning_session_id_item_id: {
        planning_session_id: planningSessionId,
        item_id: itemId
      }
    }
  })
}
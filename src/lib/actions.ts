// src/lib/actions.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Item actions
export async function createItem(name: string) {
  const normalizedName = name.toLowerCase().trim()
  
  try {
    const item = await prisma.item.create({
      data: { name: normalizedName }
    })
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

export async function getRecipes() {
  return await prisma.recipe.findMany({
    include: {
      recipe_items: {
        include: { item: true }
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function getRecipe(id: number) {
  return await prisma.recipe.findUnique({
    where: { id },
    include: {
      recipe_items: {
        include: { item: true }
      }
    }
  })
}
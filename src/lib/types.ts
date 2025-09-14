// src/lib/types.ts

import { Prisma } from "@prisma/client"

export type MealAssignmentWithRecipe = Prisma.MealAssignmentGetPayload<{
  include: { recipe: true }
}>;

export type RecipeWithItems = Prisma.RecipeGetPayload<{
  include: { 
    recipe_items: {
      include:{
        item: true
      }
    }
  }
}>;

export type StapleSelectionWithItem = Prisma.StapleSelectionGetPayload<{
  include: {
    item: true
  }
}>;

export type ItemExclusionWithItem = Prisma.ItemExclusionGetPayload<{
  include: {
    item: true
  }
}>;

export type AdhocItemWithItem = Prisma.AdhocItemGetPayload<{
  include: {
    item: true
  }
}>;
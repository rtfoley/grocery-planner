# Meal-Centric UI/UX Refactor

## Overview

This document outlines a proposed refactor to shift from a "recipe slot + sides" approach to a holistic "meal-centric" approach where each meal is defined as a complete unit containing:
- One main entree recipe (optional)
- Zero or more side recipes
- Zero or more individual side items

## Current State Analysis

### Current Database Schema
```
meal_assignments (current)
├── id (PK)
├── planning_session_id (FK)
├── date (nullable)
└── recipe_id (FK, nullable)

meal_side_items (current)
├── id (PK)
├── planning_session_id (FK)
├── date (nullable)
├── item_id (FK)
└── amount (nullable)
```

### Current UX Flow
1. Planning session starts with one meal assignment per day (empty recipe slots)
2. User selects a recipe for each slot via dropdown
3. User can add additional meal slots to any day
4. User can add side items to any day via inline form
5. Meals and sides are grouped by date but not explicitly linked

### Problems with Current Approach
1. **Lack of cohesion**: Main recipe and sides are separate entities, making it unclear which sides go with which meal on days with multiple meals
2. **Pre-allocated slots**: Empty recipe slots are created upfront, which feels unnecessary
3. **No side recipes**: Can't add a recipe as a "side" - only individual items
4. **Mental model mismatch**: Users think in terms of "meals" (chicken + green beans + rice) not "recipe slots + side items"

## Proposed Solution

### New Mental Model
A "meal" is a first-class concept that contains:
- **Recipes** (0-n): Any number of recipes (no distinction between entree/side)
- **Items** (0-n): Individual ingredients/items for this meal

### New Database Schema

```sql
-- New table: represents a cohesive meal
meals
├── id (PK)
├── planning_session_id (FK)
├── date (nullable)
├── name (nullable, e.g., "Dinner", "Lunch")
└── created_at

-- Replaces meal_assignments: links recipes to meals
meal_recipes
├── id (PK)
├── meal_id (FK)
├── recipe_id (FK)
└── UNIQUE(meal_id, recipe_id)

-- Replaces meal_side_items: links items to specific meals (NOT dates)
meal_items
├── id (PK)
├── meal_id (FK)
├── item_id (FK)
├── amount (nullable)
└── UNIQUE(meal_id, item_id)
```

### Key Design Decisions

**1. No recipe "role" field:**
- Simpler mental model - a meal is just a collection of recipes + items
- More flexible - user decides ordering/importance visually
- Avoids forced categorization - not all meals have a clear entree
- Can add role later if needed (backward compatible)

**2. Items linked to meal_id (not date):**
- **Critical change** - clear ownership of items to specific meals
- Solves ambiguity: on days with multiple meals, we know which items go with which
- Enables proper meal editing: see all components together
- No migration complexity since we have no user data yet

**Rationale:**
1. Clearer domain model - "meal" is the primary concept
2. Better data integrity - all meal components explicitly linked
3. More flexible - no arbitrary categorization
4. Cleaner queries - one meal ID gives you everything
5. Easier to extend - foundation for meal templates, favorites, etc.

## New UX Flow

### Main Meal Planning Screen
```
[Date Card: Monday, Jan 15]
  [+ Add Meal] button

  [Meal Card 1: Dinner]
    Recipes: Chicken Parmesan, Caesar Salad, Garlic Bread
    Items: green beans: 1 lb
    [Edit] [Delete]

  [Meal Card 2]
    Recipes: Fruit Salad
    [Edit] [Delete]
```

### Add/Edit Meal Dialog
```
┌─────────────────────────────────────┐
│ Add Meal                        [×] │
├─────────────────────────────────────┤
│                                     │
│ Meal Name (optional)                │
│ [Dinner              ]              │
│                                     │
│ Recipes                             │
│ [+ Add Recipe]                      │
│   • Chicken Parmesan      [×]       │
│   • Caesar Salad          [×]       │
│   • Garlic Bread          [×]       │
│                                     │
│ Additional Items                    │
│ [+ Add Item]                        │
│   • green beans: 1 lb     [×]       │
│   • butter: 2 tbsp        [×]       │
│                                     │
│           [Cancel] [Save Meal]      │
└─────────────────────────────────────┘
```

## Migration Strategy

### Simplified Approach (No User Data to Preserve)

Since there are currently no users with production data, we can simply drop and recreate the meal-related tables with the new schema.

#### Tables to PRESERVE (have real data)
- `recipes`
- `items`
- `recipe_items`
- `shopping_groups`
- `planning_sessions` (keep structure, may be empty)
- All authentication and user-related tables

#### Tables to DROP and RECREATE
- `meal_assignments` (old schema, can drop)
- `meal_side_items` (old schema, can drop)

#### Migration SQL

```sql
-- Drop old meal tables (no data loss concern)
DROP TABLE IF EXISTS meal_side_items CASCADE;
DROP TABLE IF EXISTS meal_assignments CASCADE;

-- Create new meals table
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  date DATE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create new meal_recipes junction table
CREATE TABLE meal_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE(meal_id, recipe_id)
);

-- Create new meal_items junction table
CREATE TABLE meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount TEXT,
  UNIQUE(meal_id, item_id)
);

-- Add indexes for performance
CREATE INDEX idx_meals_session ON meals(planning_session_id);
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_meal_recipes_meal ON meal_recipes(meal_id);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);
```

#### Workflow
1. Apply migration to Supabase
2. Regenerate TypeScript types: `npx supabase gen types typescript`
3. Update application code (types, actions, components)
4. Test with fresh data

### Migration Benefits

This simplified approach eliminates:
- Data migration complexity
- Migration rollback concerns
- Multi-meal date ambiguity issues
- Need for user communication about data changes

## Detailed Task List

### Part 1: Database Schema (Do First)

- [x] **1.1**: Create migration SQL script - `meal-migration.sql`
  - [x] Drop `meal_side_items` table
  - [x] Drop `meal_assignments` table
  - [x] Create `meals` table
  - [x] Create `meal_recipes` table (no role field)
  - [x] Create `meal_items` table (with meal_id FK, not date)
  - [x] Add foreign key constraints with CASCADE deletes
  - [x] Add indexes (meal_id, planning_session_id, date)
  - [x] Add UNIQUE constraints on junction tables
  - [x] Update `supabase.sql` to reflect new full database schema

- [ ] **1.2**: Apply migration and regenerate types - done manually by human
  - [x] Apply migration to Supabase via SQL editor or migration tool
  - [x] Run `npx supabase gen types typescript` to regenerate database.types.ts
  - [x] Verify types match new schema
  - [x] Commit updated database.types.ts

### Part 2: TypeScript Types & Actions

- [x] **2.1**: Add TypeScript types (types.ts)
  - [x] Import and re-export auto-generated base types from database.types.ts:
    - [x] `Meal = Tables['meals']['Row']`
    - [x] `MealRecipe = Tables['meal_recipes']['Row']`
    - [x] `MealItem = Tables['meal_items']['Row']`
  - [x] Define composite types (relationships not auto-generated):
    - [x] `MealWithDetails` - Meal with related meal_recipes and meal_items
    - [x] Inline type definitions for meal_recipes array items (with recipe relation)
    - [x] Inline type definitions for meal_items array items (with item relation)

- [x] **2.2**: Create meal server actions (actions.ts)
  - [x] `createMeal(sessionId, date, name?)` → creates empty meal
  - [x] `getMeal(mealId)` → returns MealWithDetails
  - [x] `getMeals(sessionId)` → returns all meals for session with full details
  - [x] `updateMeal(mealId, name?, date?)` → update meal metadata
  - [x] `deleteMeal(mealId)` → cascades to meal_recipes and meal_items

- [x] **2.3**: Create meal_recipes server actions
  - [x] `addRecipeToMeal(mealId, recipeId)` → adds recipe to meal
  - [x] `removeRecipeFromMeal(mealRecipeId)` → removes recipe from meal

- [x] **2.4**: Create meal_items server actions
  - [x] `addItemToMeal(mealId, itemId, amount)` → adds individual item
  - [x] `updateMealItem(mealItemId, amount)` → updates amount
  - [x] `removeMealItem(mealItemId)` → removes item

### Part 3: UI Components

- [x] **3.1**: Create MealCard component
  - [x] Display meal name (if set) or show generic label
  - [x] Display all recipes as comma-separated list
  - [x] Display individual items with amounts
  - [x] Edit and Delete buttons
  - [x] Handle empty meals gracefully (show placeholder)
  - [x] Use Mantine Card component for styling

- [x] **3.2**: Create MealDialog component (Add/Edit)
  - [x] Modal wrapper using Mantine Modal
  - [x] Meal name TextInput (optional)
  - [x] "Recipes" section:
    - [x] RecipeAutocomplete or Select component
    - [x] "Add Recipe" button
    - [x] List of added recipes with remove icons
  - [x] "Additional Items" section:
    - [x] ItemAutocomplete component
    - [x] Amount TextInput
    - [x] "Add Item" button
    - [x] List of added items with amounts and remove icons
  - [x] Save and Cancel buttons
  - [x] Form state management
  - [x] Handle edit mode (pre-populate with meal data)

- [x] **3.3**: Update MealList component
  - [x] Remove old meal assignment Select dropdowns
  - [x] Remove old side item inline form UI
  - [x] Group MealCards by date
  - [x] Add "Add Meal" button per date section
  - [x] Open MealDialog on "Add Meal" click
  - [x] Pass meal data to dialog for editing
  - [x] Handle meal dialog open/close state

- [x] **3.4**: Update MealPlanner component
  - [x] Replace `mealAssignments` state with `meals` state
  - [x] Remove `mealSideItems` state (now part of meals)
  - [x] Update `loadSession` to call `getMeals(sessionId)`
  - [x] Implement `handleCreateMeal` (calls createMeal + updates state)
  - [x] Implement `handleUpdateMeal` (updates meal, recipes, items)
  - [x] Implement `handleDeleteMeal` (calls deleteMeal + updates state)
  - [x] Remove `startNewSession` pre-creation of meal slots
  - [x] Pass meal handlers to MealList

### Part 4: Shopping List Integration

- [x] **4.1**: Update ShoppingList component
  - [x] Accept `meals` prop instead of `mealAssignments` and `mealSideItems`
  - [x] Remove old meal_assignments aggregation logic
  - [x] Remove old meal_side_items aggregation logic
  - [x] Add new aggregation for meal recipes (extract all recipes from meals)
  - [x] Add new aggregation for meal items (extract all items from meals)
  - [x] Ensure proper deduplication across recipe items, meal items, staples, and adhoc items
  - [x] Update dependencies array in useMemo hooks

- [x] **4.2**: Update MealPlanner to pass meals to ShoppingList
  - [x] Pass `meals` prop to ShoppingList
  - [x] Remove `mealAssignments` and `mealSideItems` props from ShoppingList

- [x] **4.3**: Update formatItem display logic (optional enhancement)
  - [x] Consider showing which meals an item appears in
  - [x] Update flags if needed

### Part 5: Testing & Cleanup

- [ ] **5.1**: End-to-end testing
  - [ ] Create new planning session (verify no pre-created meals)
  - [ ] Add meal with recipes and items
  - [ ] Edit meal (add/remove recipes and items)
  - [ ] Delete meal
  - [ ] Verify shopping list aggregation is correct
  - [ ] Test multiple meals on same date
  - [ ] Test undated meals
  - [ ] Test empty meals
  - [ ] Test meal with only recipes (no items)
  - [ ] Test meal with only items (no recipes)

- [x] **5.2**: Remove deprecated code
  - [x] Remove `createMealAssignment` action
  - [x] Remove `getMealAssignments` action
  - [x] Remove `updateMealAssignment` action
  - [x] Remove `deleteMealAssignment` action
  - [x] Remove `createMealSideItem` action
  - [x] Remove `getMealSideItems` action
  - [x] Remove `updateMealSideItem` action
  - [x] Remove `deleteMealSideItem` action
  - [x] Remove old type definitions (MealAssignment, MealAssignmentWithRecipe, MealSideItem, MealSideItemWithItem)
  - [x] Search codebase for any remaining references to old types/actions

- [ ] **5.3**: Documentation
  - [ ] Update SupabaseMigration.md (mark meal refactor as complete)
  - [ ] Add comments to new meal-related code
  - [ ] Document meal data model in types.ts
  - [ ] Update this document (MealCentricRefactor.md) with completion status

## Benefits of This Approach

1. **Clearer mental model**: Users think in complete meals
2. **Better organization**: All meal components grouped together
3. **More flexible**: Can have side recipes, not just side items
4. **Better UX**: Single dialog to define entire meal
5. **Easier to extend**: Foundation for features like:
   - Meal templates/favorites
   - Meal copying between dates
   - Meal suggestions
   - Nutrition tracking per meal
   - Meal photos/notes

## Risks & Considerations

1. ~~**Migration complexity**: Existing data needs careful migration~~ ✅ **Mitigated**: No user data to migrate
2. **User learning curve**: New users will need to learn the meal-centric approach (though it should be more intuitive)
3. **Development time**: ~20-25 subtasks across 5 parts (estimated 1-2 days of focused work)
4. **More complex queries**: Shopping list aggregation requires extracting from meal structure
5. **Testing thoroughness**: Need to test various meal configurations (empty, recipes-only, items-only, etc.)

## Why This Approach is Recommended

**Proceed with this normalized, meal-centric approach** because:
1. ✅ Aligns with how users mentally model meal planning
2. ✅ Enables side recipes (not possible in current schema)
3. ✅ Clearer data ownership (items belong to specific meals, not just dates)
4. ✅ More maintainable long-term
5. ✅ Enables future features (meal templates, favorites, meal copying)
6. ✅ Cleaner, more flexible data model
7. ✅ No migration complexity since no user data exists yet

## Next Steps

1. ✅ **Validate approach**: Confirmed - simplified schema without role field, items linked to meals not dates
2. ✅ **Confirm no data migration needed**: Confirmed - no users, can drop/recreate tables
3. **Ready to implement**: Begin with Part 1 (Database Schema)
4. **Incremental development**: Work through parts 1-5 systematically

## Summary of Key Decisions

1. **Meal-centric approach**: Meals are first-class entities containing recipes and items
2. **No recipe roles**: Flat list of recipes per meal (no entree vs side distinction)
3. **Items belong to meals**: `meal_items.meal_id` FK instead of date-based linking
4. **Drop and recreate**: No data migration needed - can start fresh
5. **Simplified UX**: Single dialog to define complete meal with recipes and items

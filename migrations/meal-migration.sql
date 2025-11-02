-- ============================================================================
-- MEAL-CENTRIC REFACTOR MIGRATION
-- ============================================================================
-- This migration drops the old meal_assignments and meal_side_items tables
-- and creates new meal-centric tables (meals, meal_recipes, meal_items).
--
-- IMPORTANT: This migration DROPS existing meal data. Only run if you have
-- no production data to preserve.
-- ============================================================================

-- Drop old meal-related tables
DROP TABLE IF EXISTS meal_side_items CASCADE;
DROP TABLE IF EXISTS meal_assignments CASCADE;

-- ============================================================================
-- CREATE NEW MEAL TABLES
-- ============================================================================

-- Meals table: represents a complete meal
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  date DATE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meal Recipes: junction table linking recipes to meals
CREATE TABLE meal_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE(meal_id, recipe_id)
);

-- Meal Items: junction table linking individual items to meals
CREATE TABLE meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount TEXT,
  UNIQUE(meal_id, item_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_meals_session ON meals(planning_session_id);
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_meal_recipes_meal ON meal_recipes(meal_id);
CREATE INDEX idx_meal_recipes_recipe ON meal_recipes(recipe_id);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX idx_meal_items_item ON meal_items(item_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MEALS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view meals"
ON meals FOR SELECT
TO authenticated
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Group members can create meals"
ON meals FOR INSERT
TO authenticated
WITH CHECK (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Group members can update meals"
ON meals FOR UPDATE
TO authenticated
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Group members can delete meals"
ON meals FOR DELETE
TO authenticated
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- ============================================================================
-- MEAL RECIPES POLICIES
-- ============================================================================

CREATE POLICY "Group members can view meal recipes"
ON meal_recipes FOR SELECT
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "Group members can create meal recipes"
ON meal_recipes FOR INSERT
TO authenticated
WITH CHECK (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "Group members can update meal recipes"
ON meal_recipes FOR UPDATE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
)
WITH CHECK (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "Group members can delete meal recipes"
ON meal_recipes FOR DELETE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

-- ============================================================================
-- MEAL ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view meal items"
ON meal_items FOR SELECT
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "Group members can create meal items"
ON meal_items FOR INSERT
TO authenticated
WITH CHECK (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "Group members can update meal items"
ON meal_items FOR UPDATE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
)
WITH CHECK (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

CREATE POLICY "Group members can delete meal items"
ON meal_items FOR DELETE
TO authenticated
USING (
  meal_id IN (
    SELECT id FROM meals
    WHERE planning_session_id IN (
      SELECT id FROM planning_sessions
      WHERE shopping_group_id IN (
        SELECT shopping_group_id FROM shopping_group_members
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run: npx supabase gen types typescript
-- 2. Update types.ts to use new Meal types
-- 3. Update actions.ts with new meal CRUD operations
-- 4. Update UI components
-- ============================================================================

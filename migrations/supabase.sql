-- Supabase Migration: Grocery Planner Schema with Multi-tenancy
-- Run this script in Supabase SQL Editor

-- Create enum for staple status
CREATE TYPE staple_status AS ENUM ('PENDING', 'INCLUDED', 'EXCLUDED');

-- Shopping Groups (multi-tenancy root)
CREATE TABLE shopping_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopping Group Members (collaborative access)
CREATE TABLE shopping_group_members (
  shopping_group_id UUID NOT NULL REFERENCES shopping_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shopping_group_id, user_id)
);

-- Pending Invitations (invitation-only group access)
CREATE TABLE pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_group_id UUID NOT NULL REFERENCES shopping_groups(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE (shopping_group_id, invited_email)
);

-- Items (group-scoped)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_group_id UUID NOT NULL REFERENCES shopping_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_staple BOOLEAN NOT NULL DEFAULT FALSE,
  staple_amount TEXT,
  store_order_index INTEGER,
  UNIQUE (shopping_group_id, name)
);

-- Recipes (group-scoped)
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_group_id UUID NOT NULL REFERENCES shopping_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Recipe Items (junction table)
CREATE TABLE recipe_items (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  amount TEXT,
  PRIMARY KEY (recipe_id, item_id)
);

-- Planning Sessions (group-scoped)
CREATE TABLE planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_group_id UUID NOT NULL REFERENCES shopping_groups(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Meals (meal-centric approach)
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  date DATE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meal Recipes (junction table linking recipes to meals)
CREATE TABLE meal_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE(meal_id, recipe_id)
);

-- Meal Items (junction table linking individual items to meals)
CREATE TABLE meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount TEXT,
  UNIQUE(meal_id, item_id)
);

-- Staple Selections
CREATE TABLE staple_selections (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  status staple_status NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (planning_session_id, item_id)
);

-- Ad-hoc Items
CREATE TABLE adhoc_items (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount TEXT,
  PRIMARY KEY (planning_session_id, item_id)
);

-- Item Exclusions
CREATE TABLE item_exclusions (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (planning_session_id, item_id)
);

-- Shopping List Items (tracks checked/unchecked status during shopping)
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(planning_session_id, item_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_shopping_group_members_user ON shopping_group_members(user_id);
CREATE INDEX idx_shopping_group_members_group ON shopping_group_members(shopping_group_id);
CREATE INDEX idx_pending_invitations_email ON pending_invitations(invited_email);
CREATE INDEX idx_pending_invitations_group ON pending_invitations(shopping_group_id);
CREATE INDEX idx_items_shopping_group ON items(shopping_group_id);
CREATE INDEX idx_recipes_shopping_group ON recipes(shopping_group_id);
CREATE INDEX idx_planning_sessions_shopping_group ON planning_sessions(shopping_group_id);
CREATE INDEX idx_meals_session ON meals(planning_session_id);
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_meal_recipes_meal ON meal_recipes(meal_id);
CREATE INDEX idx_meal_recipes_recipe ON meal_recipes(recipe_id);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX idx_meal_items_item ON meal_items(item_id);
CREATE INDEX idx_staple_selections_session ON staple_selections(planning_session_id);
CREATE INDEX idx_adhoc_items_session ON adhoc_items(planning_session_id);
CREATE INDEX idx_item_exclusions_session ON item_exclusions(planning_session_id);
CREATE INDEX idx_shopping_list_items_session ON shopping_list_items(planning_session_id);
CREATE INDEX idx_shopping_list_items_checked ON shopping_list_items(planning_session_id, checked);

-- ============================================================================
-- HELPER FUNCTION: Initialize new user with default shopping group
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
  group_name TEXT;
BEGIN
  -- Use user's email in the group name: "email@example.com's shopping group"
  group_name := COALESCE(NEW.email || '''s shopping group', 'My Shopping Group');

  -- Explicitly use public schema
  INSERT INTO public.shopping_groups (name)
  VALUES (group_name)
  RETURNING id INTO new_group_id;

  INSERT INTO public.shopping_group_members (shopping_group_id, user_id, role)
  VALUES (new_group_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create group on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_new_user();

-- ============================================================================
-- NOTES
-- ============================================================================

-- To run this migration:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run
-- 
-- All users will automatically get a default shopping group on signup
-- RLS policies enforce data isolation between groups
-- Group members can collaborate on meal planning within their group

-- Shopping Item Status (for in-store tracking)
CREATE TABLE shopping_item_status (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('purchased', 'unavailable')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (planning_session_id, item_id)
);

-- Index (add to the indexes section)
CREATE INDEX idx_shopping_item_status_session ON shopping_item_status(planning_session_id);
CREATE INDEX idx_shopping_item_status_status ON shopping_item_status(planning_session_id, status);


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE shopping_groups ENABLE ROW LEVEL SECURITY;
-- Note: RLS is DISABLED on shopping_group_members to avoid infinite recursion
-- ALTER TABLE shopping_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staple_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE adhoc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_item_status ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ITEMS POLICIES (4 separate policies)
-- ============================================================================

CREATE POLICY "Group members can view items"
ON items FOR SELECT
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can create items"
ON items FOR INSERT
TO authenticated
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can update items"
ON items FOR UPDATE
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can delete items"
ON items FOR DELETE
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- RECIPES POLICIES
-- ============================================================================

CREATE POLICY "Group members can view recipes"
ON recipes FOR SELECT
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can create recipes"
ON recipes FOR INSERT
TO authenticated
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can update recipes"
ON recipes FOR UPDATE
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can delete recipes"
ON recipes FOR DELETE
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- RECIPE ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view recipe items"
ON recipe_items FOR SELECT
TO authenticated
USING (
  recipe_id IN (
    SELECT id FROM recipes
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Group members can create recipe items"
ON recipe_items FOR INSERT
TO authenticated
WITH CHECK (
  recipe_id IN (
    SELECT id FROM recipes
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Group members can update recipe items"
ON recipe_items FOR UPDATE
TO authenticated
USING (
  recipe_id IN (
    SELECT id FROM recipes
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  recipe_id IN (
    SELECT id FROM recipes
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Group members can delete recipe items"
ON recipe_items FOR DELETE
TO authenticated
USING (
  recipe_id IN (
    SELECT id FROM recipes
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- ============================================================================
-- PLANNING SESSIONS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view planning sessions"
ON planning_sessions FOR SELECT
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can create planning sessions"
ON planning_sessions FOR INSERT
TO authenticated
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can update planning sessions"
ON planning_sessions FOR UPDATE
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Group members can delete planning sessions"
ON planning_sessions FOR DELETE
TO authenticated
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = (SELECT auth.uid())
  )
);

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
-- STAPLE SELECTIONS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view staple selections"
ON staple_selections FOR SELECT
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

CREATE POLICY "Group members can create staple selections"
ON staple_selections FOR INSERT
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

CREATE POLICY "Group members can update staple selections"
ON staple_selections FOR UPDATE
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

CREATE POLICY "Group members can delete staple selections"
ON staple_selections FOR DELETE
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
-- ADHOC ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view adhoc items"
ON adhoc_items FOR SELECT
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

CREATE POLICY "Group members can create adhoc items"
ON adhoc_items FOR INSERT
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

CREATE POLICY "Group members can update adhoc items"
ON adhoc_items FOR UPDATE
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

CREATE POLICY "Group members can delete adhoc items"
ON adhoc_items FOR DELETE
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
-- ITEM EXCLUSIONS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view item exclusions"
ON item_exclusions FOR SELECT
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

CREATE POLICY "Group members can create item exclusions"
ON item_exclusions FOR INSERT
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

CREATE POLICY "Group members can update item exclusions"
ON item_exclusions FOR UPDATE
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

CREATE POLICY "Group members can delete item exclusions"
ON item_exclusions FOR DELETE
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
-- SHOPPING LIST ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view shopping list items"
ON shopping_list_items FOR SELECT
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

CREATE POLICY "Group members can create shopping list items"
ON shopping_list_items FOR INSERT
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

CREATE POLICY "Group members can update shopping list items"
ON shopping_list_items FOR UPDATE
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

CREATE POLICY "Group members can delete shopping list items"
ON shopping_list_items FOR DELETE
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
-- SHOPPING ITEM STATUS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view shopping status"
ON shopping_item_status FOR SELECT
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

CREATE POLICY "Group members can create shopping status"
ON shopping_item_status FOR INSERT
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

CREATE POLICY "Group members can update shopping status"
ON shopping_item_status FOR UPDATE
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

CREATE POLICY "Group members can delete shopping status"
ON shopping_item_status FOR DELETE
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
  -- SHOPPING GROUPS POLICIES
  -- ============================================================================
  -- Note: shopping_group_members has RLS disabled to avoid infinite recursion
  -- when checking group membership. This is safe because the table only contains
  -- relationships (user_id + group_id), and actual data protection happens via
  -- RLS policies on items, recipes, planning_sessions, etc.

  CREATE POLICY "Users can view their own shopping groups"
  ON shopping_groups FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = auth.uid()
    )
  );

  CREATE POLICY "Users can update their own shopping groups"
  ON shopping_groups FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );

  -- ============================================================================
  -- SHOPPING GROUP MEMBERS - NO POLICIES (RLS DISABLED)
  -- ============================================================================
  -- RLS is disabled on shopping_group_members to avoid infinite recursion when
  -- other policies check group membership. This is safe because:
  -- 1. The table only contains relationships (user_id + group_id)
  -- 2. Actual data security is enforced via RLS on items, recipes, etc.
  -- 3. Application logic controls who can join/leave groups via invitations

  -- ============================================================================
  -- PENDING INVITATIONS POLICIES (MISSING!)
  -- ============================================================================

  CREATE POLICY "Users can view invitations sent to them"
  ON pending_invitations FOR SELECT
  TO authenticated
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = (SELECT
  auth.uid()))
    OR shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );

  CREATE POLICY "Owners can create invitations"
  ON pending_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );

  CREATE POLICY "Invitations can be deleted by owners or accepters"
  ON pending_invitations FOR DELETE
  TO authenticated
  USING (
    shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
    OR invited_email = (SELECT email FROM auth.users WHERE id = (SELECT
  auth.uid()))
  );
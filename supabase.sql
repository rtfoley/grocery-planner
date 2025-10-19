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

-- Meal Assignments
CREATE TABLE meal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  date DATE
);

-- Meal Side Items (single-ingredient sides for specific dates)
CREATE TABLE meal_side_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  date DATE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount TEXT
);

-- Add index for common queries
CREATE INDEX idx_meal_assignments_session ON meal_assignments(planning_session_id);
CREATE INDEX idx_meal_assignments_date ON meal_assignments(planning_session_id, date);

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
CREATE INDEX idx_meal_assignments_session ON meal_assignments(planning_session_id);
CREATE INDEX idx_meal_assignments_date ON meal_assignments(planning_session_id, date);
CREATE INDEX idx_meal_side_items_session ON meal_side_items(planning_session_id);
CREATE INDEX idx_meal_side_items_date ON meal_side_items(planning_session_id, date);
CREATE INDEX idx_staple_selections_session ON staple_selections(planning_session_id);
CREATE INDEX idx_adhoc_items_session ON adhoc_items(planning_session_id);
CREATE INDEX idx_item_exclusions_session ON item_exclusions(planning_session_id);

-- ============================================================================
-- HELPER FUNCTION: Initialize new user with default shopping group
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Explicitly use public schema
  INSERT INTO public.shopping_groups (name)
  VALUES ('My Shopping Group')
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
ALTER TABLE shopping_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_side_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staple_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE adhoc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_exclusions ENABLE ROW LEVEL SECURITY;
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
-- MEAL ASSIGNMENTS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view meal assignments"
ON meal_assignments FOR SELECT
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

CREATE POLICY "Group members can create meal assignments"
ON meal_assignments FOR INSERT
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

CREATE POLICY "Group members can update meal assignments"
ON meal_assignments FOR UPDATE
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

CREATE POLICY "Group members can delete meal assignments"
ON meal_assignments FOR DELETE
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
-- MEAL SIDE ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Group members can view meal side items"
ON meal_side_items FOR SELECT
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

CREATE POLICY "Group members can create meal side items"
ON meal_side_items FOR INSERT
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

CREATE POLICY "Group members can update meal side items"
ON meal_side_items FOR UPDATE
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

CREATE POLICY "Group members can delete meal side items"
ON meal_side_items FOR DELETE
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
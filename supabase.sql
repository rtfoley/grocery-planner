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

-- Add index for common queries
CREATE INDEX idx_meal_assignments_session ON meal_assignments(planning_session_id);
CREATE INDEX idx_meal_assignments_date ON meal_assignments(planning_session_id, date);

-- Staple Selections
CREATE TABLE staple_selections (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  status staple_status NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (planning_session_id, item_id)
);

-- Ad-hoc Items
CREATE TABLE adhoc_items (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  amount TEXT,
  PRIMARY KEY (planning_session_id, item_id)
);

-- Item Exclusions
CREATE TABLE item_exclusions (
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  PRIMARY KEY (planning_session_id, item_id)
);

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
ALTER TABLE staple_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE adhoc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_exclusions ENABLE ROW LEVEL SECURITY;

-- Shopping Groups: Users can only see groups they belong to
CREATE POLICY "Users see their shopping groups"
ON shopping_groups FOR SELECT
USING (
  id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create shopping groups"
ON shopping_groups FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can update their groups"
ON shopping_groups FOR UPDATE
USING (
  id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete their groups"
ON shopping_groups FOR DELETE
USING (
  id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Shopping Group Members: Manage membership
CREATE POLICY "Users see members of their groups"
ON shopping_group_members FOR SELECT
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join groups"
ON shopping_group_members FOR INSERT
WITH CHECK (
  -- Owners can add members
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR
  -- Users can accept their own invitations
  (
    user_id = auth.uid() AND
    shopping_group_id IN (
      SELECT shopping_group_id FROM pending_invitations
      WHERE invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND expires_at > NOW()
    )
  )
);

CREATE POLICY "Owners and self can remove members"
ON shopping_group_members FOR DELETE
USING (
  user_id = auth.uid() OR
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Pending Invitations: Manage invitations
CREATE POLICY "Users see relevant invitations"
ON pending_invitations FOR SELECT
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Owners can invite members"
ON pending_invitations FOR INSERT
WITH CHECK (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners and invitees can delete invitations"
ON pending_invitations FOR DELETE
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Items: Group members have full access
CREATE POLICY "Group members manage items"
ON items FOR ALL
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid()
  )
);

-- Recipes: Group members have full access
CREATE POLICY "Group members manage recipes"
ON recipes FOR ALL
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid()
  )
);

-- Recipe Items: Access via recipe ownership
CREATE POLICY "Group members manage recipe items"
ON recipe_items FOR ALL
USING (
  recipe_id IN (
    SELECT id FROM recipes
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Planning Sessions: Group members have full access
CREATE POLICY "Group members manage planning sessions"
ON planning_sessions FOR ALL
USING (
  shopping_group_id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid()
  )
);

-- Meal Assignments: Access via planning session
CREATE POLICY "Group members manage meal assignments"
ON meal_assignments FOR ALL
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Staple Selections: Access via planning session
CREATE POLICY "Group members manage staple selections"
ON staple_selections FOR ALL
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Ad-hoc Items: Access via planning session
CREATE POLICY "Group members manage adhoc items"
ON adhoc_items FOR ALL
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Item Exclusions: Access via planning session
CREATE POLICY "Group members manage item exclusions"
ON item_exclusions FOR ALL
USING (
  planning_session_id IN (
    SELECT id FROM planning_sessions
    WHERE shopping_group_id IN (
      SELECT shopping_group_id FROM shopping_group_members
      WHERE user_id = auth.uid()
    )
  )
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
CREATE INDEX idx_staple_selections_session ON staple_selections(planning_session_id);
CREATE INDEX idx_adhoc_items_session ON adhoc_items(planning_session_id);
CREATE INDEX idx_item_exclusions_session ON item_exclusions(planning_session_id);

-- ============================================================================
-- HELPER FUNCTION: Initialize new user with default shopping group
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Create default shopping group
  INSERT INTO shopping_groups (name)
  VALUES ('My Family')
  RETURNING id INTO new_group_id;
  
  -- Add user as owner
  INSERT INTO shopping_group_members (shopping_group_id, user_id, role)
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
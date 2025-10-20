-- Fix RLS policies for shopping_groups and shopping_group_members
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own shopping groups" ON shopping_groups;
DROP POLICY IF EXISTS "Users can view their own group memberships" ON shopping_group_members;

-- Disable RLS temporarily on shopping_group_members to avoid recursion
ALTER TABLE shopping_group_members DISABLE ROW LEVEL SECURITY;

-- Recreate shopping_groups policy - now it can query shopping_group_members freely
CREATE POLICY "Users can view their own shopping groups"
ON shopping_groups FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT shopping_group_id FROM shopping_group_members
    WHERE user_id = auth.uid()
  )
);

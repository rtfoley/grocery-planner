-- Shopping List Items Migration
-- Creates the shopping_list_items table for tracking checked/unchecked items during shopping

CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(planning_session_id, item_id)
);

-- Indexes for performance
CREATE INDEX idx_shopping_list_items_session ON shopping_list_items(planning_session_id);
CREATE INDEX idx_shopping_list_items_checked ON shopping_list_items(planning_session_id, checked);

-- Enable RLS
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their group's shopping list items
CREATE POLICY "Users can view their group's shopping list items"
  ON shopping_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planning_sessions ps
      JOIN shopping_group_members sgm ON ps.shopping_group_id = sgm.shopping_group_id
      WHERE ps.id = shopping_list_items.planning_session_id
      AND sgm.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can insert their group's shopping list items
CREATE POLICY "Users can insert their group's shopping list items"
  ON shopping_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planning_sessions ps
      JOIN shopping_group_members sgm ON ps.shopping_group_id = sgm.shopping_group_id
      WHERE ps.id = shopping_list_items.planning_session_id
      AND sgm.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can update their group's shopping list items
CREATE POLICY "Users can update their group's shopping list items"
  ON shopping_list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM planning_sessions ps
      JOIN shopping_group_members sgm ON ps.shopping_group_id = sgm.shopping_group_id
      WHERE ps.id = shopping_list_items.planning_session_id
      AND sgm.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can delete their group's shopping list items
CREATE POLICY "Users can delete their group's shopping list items"
  ON shopping_list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM planning_sessions ps
      JOIN shopping_group_members sgm ON ps.shopping_group_id = sgm.shopping_group_id
      WHERE ps.id = shopping_list_items.planning_session_id
      AND sgm.user_id = auth.uid()
    )
  );

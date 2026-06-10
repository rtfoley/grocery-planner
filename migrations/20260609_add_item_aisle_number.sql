-- Add nullable aisle numbers for item-based shopping list ordering.
-- Existing items intentionally remain NULL so aisles can be filled in later.

ALTER TABLE items
ADD COLUMN aisle_number INTEGER;

CREATE INDEX idx_items_shopping_group_aisle
ON items(shopping_group_id, aisle_number, name);

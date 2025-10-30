# Mobile Shopping List Feature - Planning Document

## Overview - V1 Simplified Approach
A dedicated mobile-optimized shopping list view that allows users to check off items as they shop. Keep it simple for v1, add complexity later as needed.

## Core Requirements (V1)
- Mobile-first design for in-store shopping
- Separate page at `/shopping/[sessionId]`
- Simple checklist interface (no grouping initially)
- Persist checked state to database
- Toggle between alphabetical and store-order sorting
- Exclude items marked as excluded in the meal planner
- Large touch targets for mobile use
- Session selector like meal planner

## Deferred to V2
- Mark items as "unavailable" (just don't check them for now)
- Grouping (pending/purchased/unavailable)
- Carry over items from previous session (could do simpler version: offer to bring in unchecked items from previous session)
- Real-time sync of meal plan changes during shopping
- Offline support / PWA
- **Email-based shopping list sharing:** Allow user to share shopping list with partner via email
  - User enters partner's email address
  - System sends email with temporary access link
  - Link grants 24-hour read/write access to that specific shopping session
  - Partner can view and check off items (syncs to database)
  - Both users see real-time updates via Supabase subscriptions
  - Access expires after 24 hours or when manually revoked
  - Similar to group invitations but session-specific and temporary
  - No account creation required for partner

---

## V1 Implementation Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Database storage** | Pre-populate all items as 'pending' | Simpler queries, better paper trail |
| **Pre-population timing** | On first visit to shopping page | Lazy loading, only when needed |
| **Item granularity** | One checkbox per item (aggregated) | Consistent with meal planner UX |
| **Amount aggregation** | One checkbox checks all instances | User doesn't care about individual sources |
| **Item expansion** | Defer to V2 | Keep v1 simple, high priority for v2 |
| **Meal plan changes** | Not expected during shopping | Shopping happens after planning is complete |
| **Concurrent usage** | No real-time collaboration | Single-user experience |
| **Session navigation** | Query params (`?session=xxx`) | Consistent with meal planner |
| **Data source** | Reuse existing fetch logic | Simple, avoid duplicate code |
| **Excluded items** | Filter client-side | Consistent with existing code |
| **Ad-hoc items** | Show and allow adding | Useful for mid-trip additions |
| **Empty state** | Message + link to planner | Clear guidance for users |
| **Excluded after checked** | Remove from list entirely | Keeps it simple |
| **Progress indicator** | Show "X of Y checked" | Quick add, useful feedback |
| **Hide purchased** | Hidden by default with toggle | Reduce clutter, maintain order when shown |
| **Optimistic updates** | Yes, immediate checkbox response | Better UX, sync in background |

---

## Implementation Plan

### Phase 1: Database Schema
- [ ] Create migration for `shopping_list_items` table
- [ ] Run migration in Supabase
- [ ] Generate TypeScript types

### Phase 2: Server Actions
- [ ] `getShoppingListItems(sessionId)` - Fetch items with checked status
- [ ] `upsertShoppingListItems(sessionId, items[])` - Bulk insert on first load
- [ ] `toggleItemChecked(sessionId, itemId, checked)` - Toggle item
- [ ] Reuse existing actions for recipes/meals/staples/adhoc/exclusions

### Phase 3: UI Components
- [ ] Create `/shopping/page.tsx` route (query params)
- [ ] Session selector dropdown
- [ ] Checklist with large touch targets
- [ ] Sort toggle (A-Z / Store Order)
- [ ] Progress indicator
- [ ] "Show Purchased" toggle
- [ ] Ad-hoc item adding
- [ ] Empty state

### Phase 4: Integration
- [ ] Add navigation link
- [ ] Test on mobile
- [ ] Verify persistence on reload

---

## Database Schema

```sql
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(planning_session_id, item_id)
);

CREATE INDEX idx_shopping_list_items_session ON shopping_list_items(planning_session_id);
CREATE INDEX idx_shopping_list_items_checked ON shopping_list_items(planning_session_id, checked);

-- RLS Policies
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

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
```

---

## Future Considerations

### Wizard-Style Workflow
Step-by-step wizard (Plan → Staples → Review → Shop) instead of single-page approach. Not pursuing for now but worth revisiting if onboarding becomes an issue.

### Tab-Based Meal Planning
Split meal planner into tabs for more focused views. Defer until pain points emerge.

### Layout Improvements
Meal list full-width at top, staples/shopping in columns below. Added to SupabaseMigration.md Phase 7.

---

## V2 Features Reference

The following features were considered but deferred to V2:
- **Unavailable items tracking:** Mark items as unavailable, carry over to next session
- **Grouping:** Separate sections for pending/purchased/unavailable items
- **Item expansion:** Show recipe/meal breakdown for each item
- **Email-based sharing:** Temporary collaborative access via email link
- **Real-time sync:** Updates from meal planner reflected immediately
- **Offline support:** PWA with service worker
- **Advanced mobile features:** Haptic feedback, pull-to-refresh, screen wake lock

Original detailed planning questions are available in git history if needed.

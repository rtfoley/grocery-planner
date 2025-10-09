# Supabase Migration: Application Changes Guide

## Overview

This document outlines the high-level application changes required when migrating from SQLite (local Pi deployment) to Supabase (cloud-hosted with multi-tenancy). The focus is on functional and architectural changes, not SQL syntax.

---

## 1. Multi-Tenancy & Shopping Groups

### Current State (SQLite)
- Single family/household per database
- No concept of users or groups
- No authentication required

### New State (Supabase)
- Multiple families can use the same system
- Each family has their own isolated "Shopping Group"
- All data is scoped to shopping groups
- Users can belong to multiple shopping groups

### Application Changes Required

#### User Context Management
```typescript
// New: Track active shopping group
const [activeGroupId, setActiveGroupId] = useState<string>();

// All queries must filter by shopping group
const { data: items } = await supabase
  .from('items')
  .select('*')
  .eq('shopping_group_id', activeGroupId);
```

#### Group Selection UI
- Add group selector dropdown in main navigation
- Show group name in header/title
- Store active group preference in user settings
- Handle switching between groups

#### Shopping Group Management
**New pages/features needed:**
- `/settings/groups` - List user's shopping groups
- Group creation flow
- Group settings (rename, delete)
- Member management interface

---

## 2. Authentication System

### Current State
- No authentication
- Direct database access

### New State
- Supabase Auth required for all operations
- User accounts with email/password
- Session management

### Application Changes Required

#### Auth Flow
**New pages needed:**
- `/login` - Email/password login
- `/signup` - New account creation
- `/forgot-password` - Password reset

**Integration points:**
```typescript
// Wrap app in auth provider
import { SessionContextProvider } from '@supabase/auth-helpers-react'

// Protect routes
if (!session) {
  redirect('/login');
}

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

#### Onboarding Flow
1. User signs up
2. Automatic creation of "My Shopping Group" (via database trigger)
3. User becomes owner of new group
4. Redirect to meal planning page

---

## 3. Invitation System

### Current State
- No concept of invitations
- No sharing functionality

### New State
- Owners can invite members via email
- Invitation-only group access
- Pending invitations tracked in database

### Application Changes Required

#### Invitation Creation
**New UI components:**
- "Invite Member" button in group settings
- Modal with email input field
- Invitation link/code generation

**Implementation:**
```typescript
async function inviteMember(email: string) {
  await supabase
    .from('pending_invitations')
    .insert({
      shopping_group_id: activeGroupId,
      invited_email: email,
      invited_by: user.id
    });
  
  // Send email notification (external service or Supabase function)
  await sendInvitationEmail(email, activeGroupId);
}
```

#### Invitation Acceptance
**New UI components:**
- "Pending Invitations" banner/page
- Accept/decline buttons
- Invitation list view

**Implementation:**
```typescript
async function acceptInvitation(invitationId: string, groupId: string) {
  // Join group
  await supabase
    .from('shopping_group_members')
    .insert({
      shopping_group_id: groupId,
      user_id: user.id,
      role: 'member'
    });
  
  // Clean up invitation
  await supabase
    .from('pending_invitations')
    .delete()
    .eq('id', invitationId);
}
```

#### Member Management
**New UI components:**
- Member list in group settings
- Remove member button (owners only)
- Pending invitations list (owners only)
- Cancel invitation button

---

## 4. Data Model Changes

### ID Type Changes
**Current:** Auto-incrementing integers (`1, 2, 3...`)  
**New:** UUIDs (`550e8400-e29b-41d4-a9...`)

**Impact:**
- Update TypeScript types from `number` to `string`
- Update all ID comparisons
- Update URL parameters (e.g., `/recipes/[id]`)

```typescript
// Before
const [recipeId, setRecipeId] = useState<number>();

// After
const [recipeId, setRecipeId] = useState<string>();
```

### Meal Assignments Schema Change
**Current:** Composite key `(planning_session_id, date)` - one meal per date  
**New:** UUID primary key with nullable date - multiple meals per date

**Impact:**
- Can now add multiple recipes to same date
- Can add undated meals for weekly prep
- Update query logic to handle multiple meals per date
- Update UI to show multiple meals per date

```typescript
// Before: Update by composite key
await prisma.mealAssignment.update({
  where: { 
    planning_session_id_date: { planning_session_id, date } 
  },
  data: { recipe_id }
});

// After: Update by ID
await supabase
  .from('meal_assignments')
  .update({ recipe_id })
  .eq('id', assignmentId);
```

### Planning Sessions Add End Date
**Current:** Only `start_date`, assumes 14-day period  
**New:** Both `start_date` and `end_date`

**Impact:**
- Update "New Session" modal to accept date range
- Remove hardcoded 14-day logic
- Calculate duration dynamically from date range

---

## 5. New Feature: Meal Side Items

### Current State
- No way to add single-ingredient sides to specific dates
- Only options: full recipe or ad-hoc (session-wide) items

### New State
- New `meal_side_items` table
- Date-specific single ingredients (e.g., "green beans on Tuesday")
- Aggregates with recipe items in shopping list

### Application Changes Required

#### UI Components
**Meal planning page:**
- Add "Add Side Item" button per date
- Modal/input for selecting item + amount
- Display side items alongside recipe assignments
- Remove side item button

**Shopping list generation:**
- Query meal_side_items along with recipe items
- Aggregate amounts across all sources

```typescript
// Shopping list sources (updated)
const shoppingItems = [
  ...recipeItems,        // From recipes via meal assignments
  ...mealSideItems,      // New: single-ingredient sides per date
  ...stapleSelections,   // Session-wide staples
  ...adHocItems          // Session-wide extras
];
```

---

## 6. Permission System

### Current State
- No permission checks
- Everyone can do everything

### New State
- Role-based permissions (owner vs member)
- RLS enforces data isolation
- Application enforces role-specific features

### Application Changes Required

#### Role Checks
```typescript
// Get user's role in current group
const { data: membership } = await supabase
  .from('shopping_group_members')
  .select('role')
  .eq('shopping_group_id', activeGroupId)
  .eq('user_id', user.id)
  .single();

const isOwner = membership?.role === 'owner';
```

#### UI Conditional Rendering
```typescript
// Show owner-only features
{isOwner && (
  <>
    <Button onClick={inviteMember}>Invite Member</Button>
    <Button onClick={deleteGroup}>Delete Group</Button>
  </>
)}
```

#### Owner-Only Actions
- Invite members
- Remove members
- Delete group
- View pending invitations
- Manage group settings

#### Member Actions
- View group content
- Create/edit recipes, items, sessions
- Leave group

---

## 7. Query Pattern Changes

### Current State (Prisma)
```typescript
// Direct queries, no filtering needed
const items = await prisma.item.findMany();
const recipes = await prisma.recipe.findMany();
```

### New State (Supabase)
```typescript
// Must filter by shopping_group_id
const { data: items } = await supabase
  .from('items')
  .select('*')
  .eq('shopping_group_id', activeGroupId);

// RLS automatically filters, but explicit is clearer
const { data: recipes } = await supabase
  .from('recipes')
  .select('*')
  .eq('shopping_group_id', activeGroupId);
```

### Composite Key Changes
**Before (Prisma):**
```typescript
// Composite keys used special syntax
where: { 
  planning_session_id_item_id: { 
    planning_session_id, 
    item_id 
  } 
}
```

**After (Supabase):**
```typescript
// Standard equality filters
.eq('planning_session_id', sessionId)
.eq('item_id', itemId)
```

---

## 8. Environment & Configuration

### New Environment Variables Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # Server-side only

# Remove old SQLite
# DATABASE_URL=file:./data/app.db
```

### Dependencies to Add
```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-nextjs
npm install @supabase/auth-helpers-react
```

### Dependencies to Remove
```bash
npm uninstall @prisma/client prisma
```

---

## 9. Page & Route Changes

### New Pages Required
- `/login` - User login
- `/signup` - User registration  
- `/settings/groups` - Shopping group management
- `/settings/profile` - User profile settings
- `/invitations` - Pending invitations (or banner on home page)

### Updated Pages
- `/` (Home) - Add group selector, check authentication
- `/recipes` - Filter by active group
- `/items` - Filter by active group
- `/store-order` - Filter by active group
- All pages need auth guards

---

## 10. Error Handling

### New Error Scenarios
- **Unauthenticated:** User not logged in
- **Unauthorized:** User not in shopping group
- **Expired invitation:** Invitation older than 7 days
- **Duplicate invitation:** Email already invited to group
- **Last owner:** Cannot remove last owner from group
- **RLS violations:** Attempting cross-group access

### Error Handling Strategy
```typescript
// Supabase returns errors in response
const { data, error } = await supabase
  .from('items')
  .insert({ ... });

if (error) {
  if (error.code === 'PGRST116') {
    // RLS violation - user not authorized
    showError('You do not have access to this resource');
  } else if (error.code === '23505') {
    // Unique constraint violation
    showError('This item already exists');
  }
}
```

---

## 11. Testing Considerations

### Multi-User Testing
- Test with multiple user accounts
- Verify data isolation between groups
- Test group switching functionality
- Verify invitation acceptance flow

### Permission Testing
- Test owner vs member capabilities
- Verify RLS prevents unauthorized access
- Test edge cases (last owner, expired invitations)

### Migration Testing
- No data migration needed (fresh start)
- Test onboarding flow thoroughly
- Verify auto-group creation on signup

---

## 12. Deployment Changes

### Current Deployment (Pi)
- Local database on Pi
- No internet dependency
- PM2 process management

### New Deployment (Supabase)
- Cloud-hosted database
- Internet required
- Can deploy frontend anywhere (Vercel, Netlify, Pi)
- Database managed by Supabase

### Deployment Options
1. **Full cloud:** Frontend on Vercel + Supabase backend
2. **Hybrid:** Frontend on Pi + Supabase backend (still requires internet)
3. **Development:** Local Next.js dev server + Supabase

---

## Implementation Checklist

### Phase 1: Infrastructure
- [ ] Set up Supabase project
- [ ] Run migration SQL script
- [ ] Configure environment variables
- [ ] Add Supabase dependencies

### Phase 2: Authentication
- [ ] Create login/signup pages
- [ ] Add auth guards to all routes
- [ ] Implement session management
- [ ] Test onboarding flow

### Phase 3: Multi-Tenancy
- [ ] Add shopping group context
- [ ] Create group selector UI
- [ ] Update all queries to filter by group
- [ ] Test data isolation

### Phase 4: Invitations
- [ ] Create invitation UI
- [ ] Implement invitation acceptance
- [ ] Add member management
- [ ] Test invitation flows

### Phase 5: New Features
- [ ] Implement meal side items
- [ ] Update shopping list aggregation
- [ ] Add flexible date range selection
- [ ] Update meal assignment logic for multiple meals/date

### Phase 6: Testing & Polish
- [ ] Multi-user testing
- [ ] Permission testing
- [ ] Error handling refinement
- [ ] Performance optimization

---

## Key Architectural Shifts

1. **From single-tenant to multi-tenant:** All data now scoped to shopping groups
2. **From local to cloud:** Database hosted remotely, requires internet
3. **From unauthenticated to authenticated:** User accounts required
4. **From implicit to explicit permissions:** Role-based access control
5. **From direct DB access to RLS-filtered:** Security enforced at database level
6. **From integer IDs to UUIDs:** Better for distributed systems
7. **From rigid meal structure to flexible:** Multiple meals per date, undated meals

---

## Notes

- RLS policies automatically filter queries, but explicit filtering is recommended for clarity
- The invitation system prevents unauthorized group access
- Auto-initialization ensures smooth onboarding
- All existing features remain functional with proper group context
- The meal side items feature addresses the single-ingredient sides use case
Migration: Complete Implementation Guide

## Overview

This document outlines the complete application changes required when migrating from SQLite (local Pi deployment) to Supabase (cloud-hosted with multi-tenancy). This guide includes functional changes, architectural decisions, implementation patterns, and testing strategies.

---

## Simplification Decisions

Based on initial requirements analysis, the following simplifications have been made to reduce complexity:

### Single Group Per User (Simplified)
- **Decision:** Assume each user belongs to only one shopping group
- **Impact:** No group selector UI needed, no group switching logic
- **Implementation:** Fetch user's single group on login, use throughout app
- **Future:** Data model supports multiple groups if needed later

### Meal Side Items (Kept)
- **Decision:** Keep `meal_side_items` table for date-specific single ingredients
- **Rationale:** Supports realistic meal planning where sides need specific dates (e.g., "green beans Tuesday")
- **Impact:** Adds one table but enables key use case not covered by ad-hoc items
- **Use case:** Single-ingredient sides per date without creating full recipes

### Store Ordering (Deferred)
- **Decision:** Keep single `store_order_index` approach from SQLite
- **Impact:** No multi-store support in initial migration
- **Future:** Can add store table later if users need multiple store layouts

### Permissions (Kept)
- **Decision:** Maintain owner/member role distinction
- **Rationale:** Prevents accidental deletions, enables proper member management
- **Impact:** Minimal complexity for important safety feature

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
- Users belong to one shopping group (simplified)

### Application Changes Required

#### Single Group Hook
```typescript
// lib/hooks/useUserGroup.ts
'use client'

import { useSession } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserGroup() {
  const session = useSession();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  const [userRole, setUserRole] = useState<'owner' | 'member'>('member');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGroup() {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('shopping_group_members')
        .select('shopping_group_id, role, shopping_groups(name)')
        .eq('user_id', session.user.id)
        .single(); // Assumes only one group

      if (data) {
        setGroupId(data.shopping_group_id);
        setGroupName(data.shopping_groups.name);
        setUserRole(data.role);
      }

      setIsLoading(false);
    }

    loadGroup();
  }, [session]);

  return { groupId, groupName, userRole, isLoading };
}
```

#### Usage in Components
```typescript
// All queries must filter by shopping group
function RecipesList() {
  const { groupId, isLoading } = useUserGroup();

  if (isLoading) return <Loader />;

  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .eq('shopping_group_id', groupId);

  return <RecipeList recipes={recipes} />;
}
```

#### Shopping Group Management
**New pages/features needed:**
- `/settings/groups` - Group settings and member management
- Group rename functionality
- Member invitation interface

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
- `/forgot-password` - Password reset (optional)

**Integration points:**
```typescript
// app/layout.tsx - Wrap app in auth provider
import { SessionContextProvider } from '@supabase/auth-helpers-react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          <MantineProvider>
            {children}
          </MantineProvider>
        </SessionContextProvider>
      </body>
    </html>
  );
}
```

#### Auth Guard Pattern
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect to login if not authenticated
  if (!session && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to home if already authenticated and on auth pages
  if (session && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
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
- "Invite Member" button in group settings (owners only)
- Modal with email input field

**Implementation:**
```typescript
async function inviteMember(email: string) {
  const { groupId } = useUserGroup();
  const session = useSession();

  const { error } = await supabase
    .from('pending_invitations')
    .insert({
      shopping_group_id: groupId,
      invited_email: email,
      invited_by: session.user.id
    });

  if (error) {
    if (error.code === '23505') {
      showError('This email has already been invited');
    } else {
      showError('Failed to send invitation');
    }
  } else {
    showSuccess('Invitation sent!');
    // Optional: Send email notification via external service
  }
}
```

#### Invitation Acceptance
**New UI components:**
- "Pending Invitations" banner on home page
- Accept/decline buttons

**Implementation:**
```typescript
async function acceptInvitation(invitationId: string, groupId: string) {
  const session = useSession();

  // Join group
  const { error: joinError } = await supabase
    .from('shopping_group_members')
    .insert({
      shopping_group_id: groupId,
      user_id: session.user.id,
      role: 'member'
    });

  if (joinError) {
    showError('Failed to join group');
    return;
  }

  // Clean up invitation
  await supabase
    .from('pending_invitations')
    .delete()
    .eq('id', invitationId);

  showSuccess('Joined group successfully!');
  // Refresh to load new group
  window.location.reload();
}

// Check for pending invitations
async function getPendingInvitations() {
  const session = useSession();
  
  const { data } = await supabase
    .from('pending_invitations')
    .select('*, shopping_groups(name)')
    .eq('invited_email', session.user.email)
    .gt('expires_at', new Date().toISOString());

  return data;
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
- Add "Add Side" button per date (next to meal assignments)
- Modal/dropdown for selecting item + amount input
- Display side items alongside recipe assignments for each date
- Remove side item button (X icon)

**Shopping list generation:**
```typescript
// Aggregate from multiple sources
const shoppingItems = [
  ...recipeItems,        // From recipes via meal assignments
  ...mealSideItems,      // Date-specific single-ingredient sides
  ...stapleSelections,   // Session-wide staples
  ...adHocItems          // Session-wide extras
];
```

### Key Differences from Ad-hoc Items

| Feature | Meal Side Items | Ad-hoc Items |
|---------|----------------|--------------|
| **Date specificity** | Per-date or undated | Session-wide only |
| **Purpose** | Part of meal plan | Extra shopping list items |
| **Visibility** | Shown with meal assignments | Separate section |
| **Use case** | "Green beans Tuesday" | "Paper towels this week" |

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
// Using the hook
const { userRole } = useUserGroup();
const isOwner = userRole === 'owner';
```

#### UI Conditional Rendering
```typescript
// Show owner-only features
{isOwner && (
  <>
    <Button onClick={openInviteModal}>Invite Member</Button>
    <Button onClick={deleteGroup} color="red">Delete Group</Button>
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

## 6. Query Pattern Changes

### Current State (Prisma)
```typescript
// Direct queries, no filtering needed
const items = await prisma.item.findMany();
const recipes = await prisma.recipe.findMany();
```

### New State (Supabase)
```typescript
// Must filter by shopping_group_id
const { groupId } = useUserGroup();

const { data: items } = await supabase
  .from('items')
  .select('*')
  .eq('shopping_group_id', groupId);

// RLS automatically filters, but explicit is clearer
const { data: recipes } = await supabase
  .from('recipes')
  .select('*')
  .eq('shopping_group_id', groupId);
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

## Implementation Patterns

### Type Generation
Generate TypeScript types from Supabase schema
Run: `npx supabase gen types typescript --project-id [project-id] > lib/database.types.ts`

## Environment & Configuration

### New Environment Variables Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Server-side only

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

## Recommended File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (authenticated)/
│   │   ├── layout.tsx          # Auth guard wrapper
│   │   ├── page.tsx            # Home / Meal Planning
│   │   ├── recipes/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   ├── items/
│   │   │   └── page.tsx
│   │   ├── store-order/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── groups/
│   │           └── page.tsx
│   └── layout.tsx              # Root layout with providers
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── groups/
│   │   ├── InvitationList.tsx
│   │   ├── MemberList.tsx
│   │   └── InviteMemberModal.tsx
│   ├── MealPlanner.tsx
│   ├── ShoppingList.tsx
│   ├── Navigation.tsx
│   └── [other existing components]
├── lib/
│   ├── supabase.ts            # Client initialization
│   ├── database.types.ts      # Generated types
│   ├── hooks/
│   │   ├── useUserGroup.ts
│   │   └── useAuth.ts
│   └── actions/               # Server actions (convert from Prisma)
│       ├── items.ts
│       ├── recipes.ts
│       ├── sessions.ts
│       └── groups.ts
└── middleware.ts              # Auth guard
```

---

## Page & Route Changes

### New Pages Required
- `/login` - User login
- `/signup` - User registration  
- `/settings/groups` - Shopping group management and member list
- Optional: `/forgot-password` - Password reset

### Updated Pages
- `/` (Home) - Check authentication, display group name
- `/recipes` - Filter by active group
- `/items` - Filter by active group
- `/store-order` - Filter by active group
- All pages need auth guards (via middleware)

### Route Protection Strategy
```typescript
// Use route groups for clean organization
app/
  (auth)/          # Public routes - login, signup
  (authenticated)/ # Protected routes - everything else
```

---

## Deployment Changes

### Current Deployment (Pi)
- Local database on Pi
- No internet dependency
- PM2 process management

### New Deployment (Supabase)
- Cloud-hosted database (Supabase)
- Internet required for all operations
- Can deploy frontend anywhere (Vercel, Netlify, or keep on Pi)
- Database managed by Supabase (auto-backups, scaling)

### Deployment Options
1. **Full cloud:** Frontend on Vercel + Supabase backend (recommended)
2. **Hybrid:** Frontend on Pi + Supabase backend (still requires internet)
3. **Development:** Local Next.js dev server + Supabase cloud database

---

## Implementation Checklist

### Phase 1: Infrastructure
- [x] Set up Supabase project at supabase.com
- [x] Run SQL migration script in Supabase SQL Editor
- [x] Copy connection details (URL, anon key, service role key)
- [x] Create `.env.local` with Supabase credentials
- [x] Install Supabase dependencies
- [x] Generate TypeScript types from Supabase schema

### Phase 2: Authentication
- [x] Create `/login` page with email/password form
- [x] Create `/signup` page with email/password form
- [x] Create auth middleware for route protection
- [x] Test signup flow (verify auto-group creation)
- [x] Test login flow
- [x] Test auth guards (accessing protected routes when logged out)

### Phase 3: Multi-Tenancy
- [x] Create `useUserGroup` hook
- [x] Update all existing queries to filter by `shopping_group_id`
- [x] Update server actions to accept and use groupId
- [x] Convert all Prisma queries to Supabase
- [x] Remove Prisma dependencies
- [x] Update TypeScript types from `number` to `string` for IDs
- [x] Test data isolation (create 2 users, verify separation)
- [x] Display group name in navigation/header

### Phase 4: New Core Features
- [x] Add flexible date range selection in New Session modal
- [x] Remove hardcoded 14-day session logic
- [ ] Fix date timezone parsing (append T00:00:00)
- [ ] Ability to see past sessions, or pick from current/ future ones that have already been started. 
  - [ ] Page should default to showing the session that includes today's date, or the next chronological session
- [ ] Update meal assignment logic for multiple meals/date
- [ ] Test undated meals functionality
- [ ] Show placeholder on planning page if no session active

### Phase 5: Meal side items
- [ ] Add "Add Side Item" button per date in meal planner
- [ ] Create item selector modal with amount input
- [ ] Display side items alongside meal assignments
- [ ] Implement remove side item functionality
- [ ] Update shopping list aggregation to include meal_side_items

### Phase 6: Mobile Shopping List
- [ ] Add new view/ page that for using shopping list at a store
- [ ] mark an item as purchased
- [ ] mark an item as unavailable
- [ ] option to group items by status (pending, purchased, unavilable)
- [ ] progress indicators
- [ ] When making a new planning session, offer to bring in unavailable items from previous session

### Phase 7: Testing & Polish
- [ ] Multi-user data isolation testing
- [ ] Date range and multiple meals testing
- [ ] Error handling refinement
- [x] Loading states for async operations
- [ ] Mobile responsiveness check

### Phase 8: Invitations
- [ ] Create `/settings/groups` page
- [ ] Build invitation creation UI (owners only)
- [ ] Build pending invitations banner/list
- [ ] Implement accept/decline invitation logic
- [ ] Build member list UI
- [ ] Implement remove member functionality (owners only)
- [ ] Test complete invitation flow end-to-end
- [ ] Permission boundary testing

---

## Key Architectural Shifts

1. **From single-tenant to multi-tenant:** All data now scoped to shopping groups
2. **From local to cloud:** Database hosted remotely, requires internet
3. **From unauthenticated to authenticated:** User accounts required for access
4. **From implicit to explicit permissions:** Role-based access control (owner/member)
5. **From direct DB access to RLS-filtered:** Security enforced at database level
6. **From integer IDs to UUIDs:** Better for distributed systems, more secure
7. **From rigid meal structure to flexible:** Multiple meals per date, undated meals supported

---

## Testing & Validation

### Critical Test Scenarios

**Data Isolation**
1. Create two user accounts → Each creates items/recipes with same names
2. Verify User A cannot see User B's data
3. Verify shopping lists don't mix items

**Invitation Flow**
1. Owner sends invitation → Invited user signs up → Accept invitation
2. Verify access to group data after acceptance
3. Verify invitation removed from pending table
4. New member creates item → Verify owner can see it

**Permission Boundaries**
1. Login as member → Verify cannot invite/delete (UI hidden + API blocked)
2. Login as owner → Verify these actions work

**Multiple Meals & Date Ranges**
1. Add 3 recipes to same date → Verify all show, shopping list aggregates correctly
2. Create sessions with varying ranges (5 days, 21 days) → Verify meal slots match
3. Test undated meals appear separately but contribute to shopping list

### Migration Validation Checklist

**Pre-Migration**
- [ ] Supabase project created and configured
- [ ] SQL script reviewed
- [ ] Environment variables documented

**Post-Migration**
- [ ] All tables created successfully
- [ ] RLS policies active on all tables
- [ ] Trigger creates group on signup
- [ ] Test user has default group

**Feature Validation**
- [ ] Login/signup works
- [ ] Can create items, recipes, sessions (all scoped to group)
- [ ] Can assign multiple meals to same date
- [ ] Can manage staples and ad-hoc items
- [ ] Shopping list generates correctly
- [ ] Can invite members (owner only)
- [ ] Can accept invitations
- [ ] Item/recipe deletion works correctly

**Security**
- [ ] Cannot access other user's data
- [ ] Cannot join group without invitation
- [ ] Member cannot perform owner actions
- [ ] RLS blocks unauthorized queries
- [ ] Expired invitations don't work

**Performance**
- [ ] Queries under 500ms
- [ ] No N+1 query problems
- [ ] Indexes on foreign keys
- [ ] Shopping list generation fast
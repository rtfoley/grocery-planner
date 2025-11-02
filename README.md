# Grocery Planner

A family meal planning and grocery list generation tool for local network deployment.

## Overview

Streamlines the process of planning meals and generating grocery lists by:
- Storing recipes with ingredients and amounts
- Planning meals for 1-2 weeks on specific dates
- Automatically generating shopping lists with ingredient counts
- Managing staple items and store ordering preferences

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript (strict mode)
- **UI:** Mantine component library
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase Auth (email/password)
- **Deployment:** Vercel (frontend) + Supabase (backend)
- **Multi-tenancy:** Shopping groups with owner/member roles

## Architecture Decisions

- **Data Operations:** Server actions (no API routes)
- **State Management:** React state with optimistic updates
- **Forms:** Mantine form system
- **Database:** Supabase cloud PostgreSQL
- **Schema Management:** Supabase migrations
- **Authentication:** Supabase Auth middleware
- **Security:** Row Level Security (RLS) for data isolation

## Data Model

### Core Entities
- **Item:** Grocery items with optional staple status and store ordering
- **Recipe:** Named collections of ingredients with amounts
- **PlanningSession:** 14-day meal planning periods with start date
- **MealAssignment:** Links specific recipes to specific dates
- **StapleSelection:** Per-session staple item selections (pending/included/excluded)
- **AdHocItem:** User-added items not from recipes or staples
- **ItemExclusion:** Items to exclude from shopping list (we have enough at home)

## Application Structure

### Pages
- `/` - Home (meal planning + live shopping list)
- `/recipes` - Recipe management (CRUD)
- `/recipes/new` - Add new recipe
- `/recipes/[id]` - Edit existing recipe
- `/store-order` - Drag-and-drop item ordering for shopping route
- `/staples` - Master staples list management

### Key Features
- **Live Shopping List:** Updates automatically as meals are planned
- **Item Autocomplete:** Smart ingredient entry with create-new capability
- **Flexible Planning:** 14 consecutive days starting from chosen date
- **Amount Concatenation:** "flour: 1 cup, 2 tbsp (+ 1 other recipe)"
- **Store Ordering:** Custom item sequence matching shopping route
- **Responsive Design:** Works on phones, tablets, and desktop

## Development Slices

### Slice 1: Recipe Management + Ephemeral Planning ✅ CURRENT
- [x] Project setup (NextJS + Prisma + Mantine)
- [x] Database foundation (Item, Recipe, RecipeItem tables)
- [x] Basic Recipe CRUD operations
- [x] Item autocomplete component
- [x] In-memory meal planning interface (14 days)
- [x] Shopping list generation with ingredient counts

### Slice 1.5: Item Exclusions
- [x] In-memory item exclusions ("we have flour at home")
- [x] Shopping list checkboxes to exclude items
- [x] Excluded items UI treatment

### Slice 2: Ad-hoc Items
- [x] In-memory ad-hoc item additions to shopping list
- [x] Unified shopping list display (recipes + ad-hoc items)

### Slice 3: Staples System
- [x] Add staple fields to Item table
- [x] StapleSelection table and management
- [x] Master staples list interface (`/staples`)
- [x] In-memory staples selection for shopping lists
- [x] Three-state staples workflow (pending/included/excluded)

### Slice 4: Store Ordering
- [x] Add store_order_index to Item table
- [x] Store ordering interface (`/store-order`)
- [x] Drag-and-drop item reordering
- [x] Shopping list display in custom store order
- [x] Warning for unpositioned items

### Slice 5: Full Persistence
- [x] Add PlanningSession, MealAssignment, AdHocItem tables
- [x] Convert all in-memory state to persistent storage
- [x] handle duplicate items across recipes and staples within a shopping list
- [x] Session history and management

### Slice 6: Usability Improvements ✅ COMPLETE
- [x] Deleting recipes
- [x] Add one-click export to iOS Notes app for offline mobile shopping
- [x] Allow user to specify start and end date of a session
- [x] Allow user to add extra meals that don't have a date specified
- [x] Allow user to add sides that are single ingredients
- [x] Allow user to add sides that are recipes

### Slice 7: Supabase Migration ✅ COMPLETE
- [x] Migrate database to Supabase with multi-tenancy support
- [x] Implement authentication system (signup/login)
- [x] Add Row Level Security for data isolation
- [x] Deploy frontend to Vercel
- [x] Convert all Prisma queries to Supabase
- [x] Implement optimistic UI updates
- [x] Mobile shopping list view with progress tracking
- [x] Group names use user email

### Slice 8: Invitation System & Polish 🚧 IN PROGRESS
- [ ] **Invitations (High Priority)**
  - [ ] Create `/settings/groups` page for group management
  - [ ] Build invitation UI (owners can invite via email)
  - [ ] Pending invitations banner with accept/decline
  - [ ] Member list with remove functionality (owners only)
  - [ ] Test complete invitation flow end-to-end

- [ ] **Production Testing & Polish**
  - [ ] Test all major features on Vercel production URL
  - [ ] Error handling refinement across all components
  - [ ] Mobile responsiveness check (all pages)
  - [ ] Performance testing (query optimization)

- [ ] **UI/UX Quick Wins**
  - [ ] Toast notifications for user actions (recipe saved, item added, etc.)
  - [ ] Enhanced empty states with helpful CTAs
  - [ ] Visual spacing improvements (card elevation, section dividers)
  - [ ] Icon and color consistency across app

### Future Enhancements

- [ ] **Phase 1 UX Improvements**
  - [ ] Mobile interaction improvements (swipe actions, better touch targets)
  - [ ] Progress indicators for planning completion
  - [ ] Micro-interactions and transitions
  - [ ] Smart defaults (auto-save drafts, recently used items)

- [ ] **Phase 2 Advanced Features**
  - [ ] Keyboard shortcuts for power users
  - [ ] Calendar view for meal planning
  - [ ] Item count badges on navigation
  - [ ] Undo/redo for accidental deletions
  - [ ] **Multiple store orders** - Support different layouts for different store locations (e.g., different Wegmans locations)

- [ ] **Post-MVP Ideas**
  - [ ] Recipe import/export
  - [ ] Nutritional information tracking
  - [ ] Shopping history analysis
  - [ ] Recipe scaling/serving adjustments
  - [ ] Meal plan templates

## Installation & Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier)

### Local Development Setup
```bash
# Clone and install dependencies
npm install

# Set up environment variables
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Start development server
npm run dev
```

### Vercel Deployment
```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys from GitHub
# Configure environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### Database Setup
See `supabase.sql` in project root for complete schema. Run in Supabase SQL Editor to:
- Create all tables with proper relationships
- Set up Row Level Security (RLS) policies
- Configure automatic group creation on user signup

## Database Schema

See `supabase.sql` for the complete data model. Key relationships:
- **Multi-tenancy:** All data scoped to `shopping_groups` with RLS enforcement
- **Recipes:** Recipe → RecipeItem → Item (many-to-many through junction table)
- **Meal Planning:** PlanningSession → Meals → MealRecipes/MealItems (flexible structure)
- **Shopping Lists:** Aggregates from recipes, staples, adhoc items, and exclusions
- **Invitations:** Pending invitations system with owner/member roles
- **Authentication:** Supabase Auth with automatic group creation on signup

## Usage Workflow

1. **Add Recipes:** Enter recipe names and ingredients with optional amounts
2. **Plan Meals:** Select start date, assign recipes to specific days (14-day span)
3. **Review Shopping List:** Auto-generated list shows ingredient counts and amounts
4. **Manage Staples:** Configure standard items to check each shopping trip
5. **Order Items:** Arrange items to match your typical store shopping route
6. **Exclude Items:** Skip items you already have at home

## Design Philosophy

- **Functionality over aesthetics:** Focus on workflow efficiency
- **Cloud-based multi-tenancy:** Secure data isolation between families
- **Optimistic UI updates:** Instant feedback for all user actions
- **Progressive enhancement:** Build complexity incrementally
- **Mobile-first:** Optimized for in-store shopping on phones
- **Collaborative:** Multiple family members can share and manage together
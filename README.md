# Grocery Planner

A family meal planning and grocery list generation tool for local network deployment.

## Overview

Streamlines the process of planning meals and generating grocery lists by:
- Storing recipes with ingredients and amounts
- Planning meals for 1-2 weeks on specific dates
- Automatically generating shopping lists with ingredient counts
- Managing staple items and store ordering preferences

## Tech Stack

- **Framework:** NextJS (App Router) with TypeScript (strict mode)
- **UI:** Mantine component library
- **Database:** SQLite with Prisma ORM
- **Deployment:** Raspberry Pi with PM2 process management
- **Development:** Local machine → build → deploy to Pi

## Architecture Decisions

- **Data Operations:** Server actions (no API routes)
- **State Management:** React state (page-specific)
- **Forms:** Mantine form system
- **Database Location:** `./data/app.db` (project root)
- **Schema Management:** Prisma migrations

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
- [ ] Session history and management

### Slice 6: Usability Improvements
- [x] Deleting recipes
- [x] Add one-click export to iOS Notes app for offline mobile shopping
- [x] allow user to specify start and end date of a session
- [ ] allow user to add extra meals that don't have a date specified
- [ ] allow user to add sides that are single ingredients
- [ ] allow user to add sides that are recipes

### Splice 7: Deployment
- [ ] Pi deployment setup
- [ ] PM2 process management configuration

### Other Features

- [ ] allow for multiple store orders (i.e. different locations of the same chain)

## Installation & Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development Setup
```bash
# Clone and install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

### Pi Deployment
```bash
# Build application
npm run build

# Deploy to Pi (replace with your Pi details)
rsync -av ./ pi@raspberrypi:/home/pi/grocery-planner/

# On Pi: install and start with PM2
pm2 start npm --name "grocery-planner" -- start
pm2 save
```

## Database Schema

See `prisma/schema.prisma` for the complete data model. Key relationships:
- Recipe → RecipeItem → Item (many-to-many through junction table)
- PlanningSession → MealAssignment → Recipe (meal planning)
- PlanningSession → StapleSelection → Item (staples per session)
- Item has optional staple status and store ordering

## Usage Workflow

1. **Add Recipes:** Enter recipe names and ingredients with optional amounts
2. **Plan Meals:** Select start date, assign recipes to specific days (14-day span)
3. **Review Shopping List:** Auto-generated list shows ingredient counts and amounts
4. **Manage Staples:** Configure standard items to check each shopping trip
5. **Order Items:** Arrange items to match your typical store shopping route
6. **Exclude Items:** Skip items you already have at home

## Design Philosophy

- **Functionality over aesthetics:** Focus on workflow efficiency
- **Local network only:** No authentication, optimized for family use
- **Progressive enhancement:** Build complexity incrementally
- **Mobile-responsive:** Usable on phones during planning
- **Print-friendly:** Shopping lists work on paper backup

## Future Enhancements (Post-MVP)

- Recipe import/export
- Nutritional information tracking
- Shopping history analysis
- Multi-store support
- Recipe scaling/serving adjustments
- Meal plan templates
- Calendar integration
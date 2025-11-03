# Query Optimization Audit

## High Priority Issues

### 1. **N+1 Queries in Recipe Creation/Update** ⚠️ HIGH IMPACT
**Location:** `createRecipe` (lines 166-201), `updateRecipe` (lines 259-302)

**Problem:**
```typescript
// Currently doing this for EACH ingredient:
for (const ing of ingredients) {
  // Query 1: Check if item exists
  let { data: item } = await supabase.from('items').select('id')...

  // Query 2: Create item if doesn't exist
  if (!item) {
    const { data: newItem } = await supabase.from('items').insert(...)
  }

  // Query 3: Create recipe_item
  await supabase.from('recipe_items').insert(...)
}
```

**Impact:** Creating a recipe with 10 ingredients = 30 queries!

**Solution:**
- Batch fetch all existing items in one query
- Batch insert new items in one query
- Batch insert recipe_items in one query
- Could reduce 30 queries → 3 queries

---

### 2. **Repeated getUserGroupId() Calls** ⚠️ MEDIUM IMPACT
**Location:** Called in almost every action

**Problem:**
```typescript
async function getUserGroupId(): Promise<string | null> {
  // Query 1: Get user
  const { data: { user } } = await supabase.auth.getUser()

  // Query 2: Get group membership
  const { data } = await supabase.from('shopping_group_members')
    .select('shopping_group_id')...
}
```

**Impact:** Every action does 2 queries just for auth

**Solution Options:**
1. Cache in middleware/context (requires architecture change)
2. Join shopping_group_id in a single query with main data
3. Add custom claim to JWT token (advanced)

**Recommendation:** Accept for now - these are fast lookups with good indexes. Optimize only if performance issues arise.

---

### 3. **updateMultipleItemOrders Not Truly Batched** ⚠️ LOW IMPACT
**Location:** `updateMultipleItemOrders` (line 128-136)

**Problem:**
```typescript
await Promise.all(
  updates.map(({ id, orderIndex }) =>
    supabase.from('items').update(...)  // Separate UPDATE per item
  )
)
```

**Impact:** Updating 50 items = 50 UPDATE queries (though parallelized)

**Solution:**
PostgreSQL doesn't have great bulk update support in Supabase SDK. Options:
1. Use raw SQL with VALUES clause
2. Accept current approach (works fine, happens infrequently)

**Recommendation:** Accept current approach - this only runs during drag-and-drop reordering which is rare.

---

## Medium Priority Issues

### 4. **Over-fetching with SELECT \***
**Locations:** Multiple queries

**Problem:**
```typescript
// Fetching all columns when we might only need a few
.select('*')
```

**Examples:**
- `getItems()` - might not need all item fields everywhere
- Deep nested queries in `getMeals()` fetch everything at 3 levels

**Impact:** Slightly larger response payloads, minimal performance impact

**Solution:**
- Specify exact fields needed: `.select('id, name, is_staple')`
- Be intentional about what nested data to fetch

**Recommendation:** Optimize on a case-by-case basis when building new features. Current usage is fine.

---

### 5. **Sequential Item Lookups in Multiple Functions**
**Locations:** `createAdhocItem`, `addShoppingListItemByName`, etc.

**Problem:**
Pattern repeated in many places:
```typescript
// Check if item exists
let { data: item } = await supabase.from('items').select('id')...

// Create if doesn't exist
if (!item) {
  const { data: newItem } = await supabase.from('items').insert(...)
}
```

**Impact:** 1-2 extra queries per operation

**Solution:**
- Extract into a reusable `getOrCreateItem()` helper
- Use PostgreSQL's `INSERT ... ON CONFLICT DO NOTHING RETURNING *` (upsert pattern)

**Recommendation:** Create helper function for code reuse and maintainability.

---

## Low Priority / Non-Issues

### 6. **Deep Nested Selects Are Actually Good** ✅
**Location:** `getMeals()` query

The nested select:
```typescript
.select(`
  *,
  meal_recipes (
    id,
    recipe:recipes (
      *,
      recipe_items (
        amount,
        item:items (*)
      )
    )
  ),
  meal_items (...)
`)
```

**Analysis:** This is actually GOOD - it's doing a single query with JOINs instead of multiple round trips. Supabase optimizes this well.

**Recommendation:** Keep as-is.

---

### 7. **Good Index Coverage** ✅
**Review of indexes from schema:**

All the right indexes exist:
- `idx_shopping_group_members_user` - for getUserGroupId lookups
- `idx_items_shopping_group` - for item filtering
- `idx_recipes_shopping_group` - for recipe filtering
- Foreign key indexes on all junction tables
- `idx_shopping_list_items_checked` - for shopping list filtering

**Recommendation:** No additional indexes needed.

---

## Recommended Action Plan

### Phase 1: High Impact (✅ COMPLETED)
1. ✅ **Optimized `createRecipe()`** - Batch ingredient processing
   - **Before:** 3N queries for N ingredients (select + insert + recipe_item insert per ingredient)
   - **After:** 4-5 queries total regardless of N (batch select, batch insert items, batch insert recipe_items)
   - **Impact:** Recipe with 10 ingredients: 30 queries → 5 queries (83% reduction)

2. ✅ **Optimized `updateRecipe()`** - Batch ingredient updates
   - **Before:** Multiple queries per ingredient for updates/adds
   - **After:** Batched operations (parallel updates, single batch for new items)
   - **Impact:** Updating recipe with 10 ingredients: ~25-30 queries → ~8-10 queries (70% reduction)

### Phase 2: Code Quality (Do Soon)
3. ⚠️ **Create `getOrCreateItem()` helper** - Reduce code duplication
   - Used in: `createAdhocItem`, `addShoppingListItemByName`
   - Low priority since these are infrequent operations

### Phase 3: Monitor & Accept (Do Later / Never)
4. 📊 **Monitor getUserGroupId()** - Add caching only if performance issues arise
5. 📊 **Monitor updateMultipleItemOrders** - Optimize only if users report slowness
6. 📊 **Selective field fetching** - Optimize on case-by-case basis for new features

---

## Performance Baseline Expectations

With current optimization:
- Recipe with 10 ingredients: ~30 queries → **~5 queries** (80% reduction)
- Shopping list page load: ~5-8 queries (acceptable)
- Meal planning page load: ~10-15 queries (acceptable with nested data)

The app should feel snappy for groups with:
- Up to 500 items
- Up to 100 recipes
- Up to 50 meals per session

If you grow beyond this, revisit caching strategies.

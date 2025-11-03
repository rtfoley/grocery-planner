# Error Handling Audit

## Current State Analysis

### ✅ Good Practices Already in Place

1. **Try-catch blocks in server actions** - Most actions have error handling
2. **Return success/error objects** - Consistent pattern: `{ success: boolean, error?: string }`
3. **Console logging** - Errors logged with `console.error()` for debugging
4. **Optimistic UI updates** - Client components show immediate feedback
5. **Toast notifications** - Using Mantine notifications for user feedback

---

## Issues Found

### 🔴 High Priority

#### 1. **Silent Failures in Some Actions**
**Location:** Multiple places in `lib/actions.ts`

**Problem:** Some functions return `null` on error without explaining why
```typescript
export async function createPlanningSession(startDate: string, endDate: string) {
  // ...
  const { data } = await supabase.from('planning_sessions').insert(...)
  return data || null  // ❌ Silent failure - user won't know why
}
```

**Impact:** Users see "something didn't work" but no explanation

**Solution:** Return error objects consistently
```typescript
try {
  const { data, error } = await supabase.from('planning_sessions').insert(...)
  if (error) throw error
  return { success: true, data }
} catch (error) {
  return { success: false, error: 'Failed to create planning session' }
}
```

**Affected functions:**
- `createPlanningSession()`
- `getPlanningSession()`
- `createStapleSelection()`
- `updateStapleSelection()`
- `createAdhocItem()`
- `addItemExclusion()`
- `createMeal()`
- `getMeal()`
- `updateMeal()`
- `addRecipeToMeal()`
- `addItemToMeal()`
- `updateMealItem()`

---

#### 2. **Missing Error Boundaries in Components**
**Location:** React components

**Problem:** No error boundaries to catch unexpected errors

**Impact:** White screen of death if component errors

**Solution:** Add error boundary wrapper
```typescript
// src/Components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  // Catch errors and show fallback UI
}
```

**Priority:** HIGH - prevents complete app crashes

---

#### 3. **Network Failure Handling Missing**
**Location:** Client components making server action calls

**Problem:** No specific handling for network timeouts or connection loss

**Example:**
```typescript
const handleAddItem = async () => {
  const newItem = await addShoppingListItemByName(sessionId, newItemName.trim())
  // ❌ What if network fails? What if it times out?
  if (newItem) {
    setShoppingListItems(prev => [...prev, newItem])
  }
}
```

**Solution:** Add timeout and retry logic

---

### 🟡 Medium Priority

#### 4. **Generic Error Messages**
**Problem:** Users get vague error messages

**Examples:**
- "Failed to create recipe" - Why? Duplicate name? Network issue?
- "Failed to update item order" - Which item? What went wrong?

**Solution:** More specific error messages based on error types
```typescript
catch (error) {
  if (error.code === '23505') {  // Unique constraint violation
    return { success: false, error: 'An item with this name already exists' }
  }
  if (error.code === '23503') {  // Foreign key violation
    return { success: false, error: 'Cannot delete item - it is used in recipes' }
  }
  return { success: false, error: 'An unexpected error occurred' }
}
```

---

#### 5. **No Validation Before API Calls**
**Problem:** Sending invalid data to server, catching errors too late

**Example:**
```typescript
export async function createItem(name: string, ...) {
  // ❌ No validation - empty string would hit DB
  const normalizedName = name.toLowerCase().trim()
  const { data, error } = await supabase.from('items').insert(...)
}
```

**Solution:** Validate early
```typescript
export async function createItem(name: string, ...) {
  const normalizedName = name.toLowerCase().trim()
  if (!normalizedName) {
    return { success: false, error: 'Item name cannot be empty' }
  }
  if (normalizedName.length > 255) {
    return { success: false, error: 'Item name is too long' }
  }
  // Continue with DB operation...
}
```

---

#### 6. **Auth Errors Not User-Friendly**
**Location:** Login/signup flows

**Problem:** Technical Supabase error messages shown to users

**Example:** `"Invalid login credentials"` is okay, but some errors are cryptic

**Solution:** Map common auth errors to friendly messages

---

### 🟢 Low Priority

#### 7. **No Logging/Monitoring Strategy**
**Problem:** `console.error()` calls won't be visible in production

**Solution:** Consider adding error tracking (Sentry, LogRocket, etc.) in future

---

#### 8. **Optimistic Updates Don't Always Rollback**
**Problem:** Some optimistic updates don't rollback on server failure

**Example:** RecipesList has rollback, but some others don't

**Solution:** Review all optimistic updates for proper error handling

---

## Action Plan

### Phase 1: Critical Fixes (Do First)
1. ✅ **Standardize return types** - All actions return `{ success, data?, error? }`
2. ✅ **Add error boundaries** - Prevent white screen crashes
3. ✅ **Improve error messages** - More specific, actionable feedback

### Phase 2: Robustness (Do Soon)
4. ⚠️ **Add input validation** - Check data before DB calls
5. ⚠️ **Handle network failures** - Timeout + retry logic
6. ⚠️ **Auth error mapping** - Friendly auth messages

### Phase 3: Production-Ready (Do Before Launch)
7. 📊 **Error tracking** - Add Sentry or similar
8. 📊 **Audit optimistic updates** - Ensure rollback on failure
9. 📊 **Test error scenarios** - Deliberately trigger errors to verify handling

---

## Error Message Guidelines

**Good error messages:**
✅ "An item named 'flour' already exists"
✅ "Please enter an item name"
✅ "Network error - please check your connection and try again"
✅ "Recipe deleted successfully"

**Bad error messages:**
❌ "Error"
❌ "Failed to update"
❌ "PGRST116: JWT expired"
❌ undefined

---

## Testing Checklist

Manual tests to perform:
- [ ] Create recipe with no ingredients
- [ ] Create recipe with duplicate name
- [ ] Create item that already exists
- [ ] Delete item used in recipes
- [ ] Disconnect network mid-operation
- [ ] Session expires mid-operation
- [ ] Invalid date ranges
- [ ] SQL injection attempts (parameterized queries protect us)
- [ ] XSS attempts in item names

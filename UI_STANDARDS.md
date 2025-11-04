# UI/UX Standards

This document defines the design standards for the Grocery Planner application.

## Icon Guidelines

### Icon Library
- **Primary**: Tabler Icons (`@tabler/icons-react`)
- Consistent stroke weight across all icons

### Icon Sizes

| Context | Size | Example |
|---------|------|---------|
| Small buttons (`size="xs"`, `size="compact-xs"`) | 14px | Add buttons in compact layouts |
| Regular buttons & ActionIcons | 16px | Navigation, edit/delete buttons |
| Large touch targets (mobile) | 20px | Drag handles, primary actions |
| Alerts & modals | 16-20px | Alert icons, modal headers |

### Icon Usage Patterns

```tsx
// Small button
<Button size="xs" leftSection={<IconPlus size={14} />}>Add</Button>

// Regular button
<Button leftSection={<IconEdit size={16} />}>Edit</Button>

// Action icon
<ActionIcon size="md"><IconTrash size={16} /></ActionIcon>

// Large touch target
<ActionIcon size="lg"><IconGripVertical size={20} /></ActionIcon>
```

## Color Semantics

### Action Colors

| Color | Usage | Examples |
|-------|-------|----------|
| **Red** | Destructive actions, errors | Delete, Remove, Error alerts |
| **Green** | Success, positive actions | Include, Save success, Confirm |
| **Blue** | Primary actions, information | Edit, View, Info alerts |
| **Orange** | Warnings, caution | Warning alerts, Pending actions |
| **Gray** | Neutral, disabled states | Inactive buttons, Subtle actions |

### Semantic Usage

```tsx
// Destructive action
<ActionIcon color="red"><IconTrash /></ActionIcon>
<Button color="red">Delete Recipe</Button>

// Success/positive
<Button color="green">Include</Button>
<Alert color="green">Success!</Alert>

// Edit/info
<ActionIcon color="blue"><IconEdit /></ActionIcon>

// Warning
<Alert color="orange">Items need positioning</Alert>
```

## Visual Hierarchy

### Card Elevation
- All major content cards use: `withBorder shadow="sm"`
- Nested cards use: `withBorder` only
- Consistent padding: `padding="lg"` for main cards

### Spacing
- Use Mantine spacing tokens: `xs`, `sm`, `md`, `lg`, `xl`
- Section dividers: `<Divider my="md" />`
- Consistent gaps in Stacks/Groups

### Typography
- Page titles: `<Title order={1}>`
- Section titles: `<Title order={3}>`
- Labels: `<Text fw={500}>`
- Body text: `<Text size="sm">`
- Dimmed text: `<Text c="dimmed">`

## Button Styles

### Variants
- **Filled**: Primary actions (default)
- **Subtle**: Secondary actions, icon buttons
- **Light**: Alternative secondary style
- **Outline**: Uncommon, use sparingly

### Size Guidelines
- `size="xs"`: Compact inline actions
- `size="sm"`: Dense layouts, forms
- `size="md"`: Default size (most common)
- `size="lg"`: Primary CTAs

## User Feedback

### Loading States
- All async operations show loading spinners
- Use `loading` prop on buttons
- Disable related actions during operations

### Notifications
- Success: Green toast notifications
- Errors: Red toast notifications
- Auto-dismiss after 4-5 seconds
- Include clear, actionable messages

### Confirmations
- Use `ConfirmationModal` for destructive actions
- Red confirm button for destructive operations
- Clear description of consequences
- Example: "Delete Recipe" modal

## Touch Targets (Mobile)

### Minimum Sizes
- Buttons: At least 44x44px touch target
- ActionIcons: Use `size="md"` or larger
- Interactive areas: Adequate spacing between targets

### Mobile Optimizations
- Larger icons for primary actions (20px)
- Adequate spacing in lists/grids
- Clear visual feedback on touch
- Use `wrap="nowrap"` to prevent layout shifts

## Accessibility

### ARIA Labels
- All icon-only buttons have `aria-label`
- Form inputs have proper labels
- Loading states announced to screen readers

### Color Contrast
- Text meets WCAG AA standards
- Dimmed text still readable
- Icons visible against backgrounds

## Best Practices

1. **Consistency**: Use existing patterns before creating new ones
2. **Semantics**: Colors should match their meaning
3. **Feedback**: Every user action gets visual feedback
4. **Progressive Enhancement**: Core functionality works without JavaScript
5. **Mobile-First**: Design for touch, enhance for mouse

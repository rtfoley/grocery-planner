// src/components/RecipeAutocomplete.tsx
'use client'

import { Autocomplete } from '@mantine/core'
import { Recipe } from '@/lib/types'

interface RecipeAutocompleteProps {
  recipes: Recipe[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  style?: React.CSSProperties
  error?: string
  size?: string
}

export function RecipeAutocomplete({
  recipes,
  value,
  onChange,
  label,
  placeholder,
  style,
  error,
  size
}: RecipeAutocompleteProps) {
  const recipeNames = recipes.map(recipe => recipe.name)

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      data={recipeNames}
      style={style}
      error={error}
      size={size}
    />
  )
}

// src/components/ItemAutocomplete.tsx
'use client'

import { useState, useEffect } from 'react'
import { Autocomplete } from '@mantine/core'
import { getItems } from '@/lib/actions'

interface ItemAutocompleteProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  style?: React.CSSProperties
  error?: string
  size?: string
  items?: string[] // Optional: pass in pre-loaded items to avoid multiple fetches
}

export function ItemAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  style,
  error,
  size,
  items: itemsProp
}: ItemAutocompleteProps) {
  const [items, setItems] = useState<string[]>(itemsProp || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only load items if not provided via props
    if (itemsProp) {
      setItems(itemsProp)
      return
    }

    const loadItems = async () => {
      setLoading(true)
      try {
        const itemData = await getItems()
        setItems(itemData.map(item => item.name))
      } catch (error) {
        console.error('Failed to load items:', error)
      }
      setLoading(false)
    }

    loadItems()
  }, [itemsProp])

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      data={items}
      style={style}
      error={error}
      disabled={loading}
      size={size}
    />
  )
}
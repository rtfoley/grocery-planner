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
}

export function ItemAutocomplete({ 
  value, 
  onChange, 
  label, 
  placeholder,
  style,
  error
}: ItemAutocompleteProps) {
  const [items, setItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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
  }, [])

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
    />
  )
}
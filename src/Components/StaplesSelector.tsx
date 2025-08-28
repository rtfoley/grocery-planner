// src/Components/StaplesSelector.tsx
'use client'

import { Card, Title, Text, Stack, Group, Button } from '@mantine/core'

interface Staple {
  id: number
  name: string
  staple_amount: string | null
}

interface StaplesSelectorProps {
  staples: Staple[]
  stapleSelections: Map<number, 'pending' | 'included' | 'excluded'>
  onStapleSelection: (stapleId: number, status: 'pending' | 'included' | 'excluded') => void
}

export function StaplesSelector({ 
  staples, 
  stapleSelections, 
  onStapleSelection 
}: StaplesSelectorProps) {
  if (staples.length === 0) {
    return null
  }

  return (
    <Card>
      <Title order={3} mb="md">Staples</Title>
      <Stack gap="xs">
        {staples.map(staple => {
          const selection = stapleSelections.get(staple.id) || 'pending'
          return (
            <Group key={staple.id} justify="space-between" align="center">
              <Text size="sm" style={{ flex: 1 }}>
                {staple.staple_amount ? `${staple.name}: ${staple.staple_amount}` : staple.name}
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant={selection === 'included' ? 'filled' : 'subtle'}
                  color={selection === 'included' ? 'green' : 'gray'}
                  onClick={() => onStapleSelection(staple.id, 'included')}
                >
                  Include
                </Button>
                <Button
                  size="xs"
                  variant={selection === 'excluded' ? 'filled' : 'subtle'}
                  color={selection === 'excluded' ? 'red' : 'gray'}
                  onClick={() => onStapleSelection(staple.id, 'excluded')}
                >
                  Skip
                </Button>
              </Group>
            </Group>
          )
        })}
      </Stack>
    </Card>
  )
}
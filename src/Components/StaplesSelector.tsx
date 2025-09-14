// src/Components/StaplesSelector.tsx
'use client'

import { StapleSelectionWithItem } from '@/lib/types'
import { Card, Title, Text, Stack, Group, Button } from '@mantine/core'
import { StapleStatus } from '@prisma/client'

interface StaplesSelectorProps {
  stapleSelections: StapleSelectionWithItem[]
  onStapleSelection: (staple: StapleSelectionWithItem, newStatus: StapleStatus) => void
}

export function StaplesSelector({  
  stapleSelections, 
  onStapleSelection 
}: StaplesSelectorProps) {
  return (
    <Card>
      <Title order={3} mb="md">Staples</Title>
      <Stack gap="xs">
        {stapleSelections.map((staple: StapleSelectionWithItem) => {
          return (
            <Group key={staple.item_id} justify="space-between" align="center">
              <Text size="sm" style={{ flex: 1 }}>
                {staple.item.staple_amount ? `${staple.item.name}: ${staple.item.staple_amount}` : staple.item.name}
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant={staple.status === StapleStatus.INCLUDED ? 'filled' : 'subtle'}
                  color={staple.status === StapleStatus.INCLUDED ? 'green' : 'gray'}
                  onClick={() => onStapleSelection(staple, StapleStatus.INCLUDED)}
                >
                  Include
                </Button>
                <Button
                  size="xs"
                  variant={staple.status === StapleStatus.EXCLUDED ? 'filled' : 'subtle'}
                  color={staple.status === StapleStatus.EXCLUDED ? 'red' : 'gray'}
                  onClick={() => onStapleSelection(staple, StapleStatus.EXCLUDED)}
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
// src/Components/StaplesSelector.tsx
'use client'

import { StapleSelectionWithItem, StapleStatus, StapleStatusEnum } from '@/lib/types'
import { Card, Title, Text, Stack, Group, Button } from '@mantine/core'

interface StaplesSelectorProps {
  stapleSelections: StapleSelectionWithItem[]
  onStapleSelection: (staple: StapleSelectionWithItem, newStatus: StapleStatus) => void
}

export function StaplesSelector({
  stapleSelections,
  onStapleSelection
}: StaplesSelectorProps) {
  return (
    <Card withBorder shadow="sm" padding="lg">
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
                  variant={staple.status === StapleStatusEnum.INCLUDED ? 'filled' : 'subtle'}
                  color={staple.status === StapleStatusEnum.INCLUDED ? 'green' : 'gray'}
                  onClick={() => onStapleSelection(staple, StapleStatusEnum.INCLUDED)}
                >
                  Include
                </Button>
                <Button
                  size="xs"
                  variant={staple.status === StapleStatusEnum.EXCLUDED ? 'filled' : 'subtle'}
                  color={staple.status === StapleStatusEnum.EXCLUDED ? 'red' : 'gray'}
                  onClick={() => onStapleSelection(staple, StapleStatusEnum.EXCLUDED)}
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
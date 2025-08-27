// src/components/Navigation.tsx
'use client'

import { Container, Group, Button, Box, ActionIcon, useMantineColorScheme } from '@mantine/core'
import { IconSun, IconMoon } from '@tabler/icons-react'
import Link from 'next/link'

export function Navigation() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  return (
    <Box style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', marginBottom: '1rem' }}>
      <Container size="lg">
        <Group h={60} justify="space-between">
          <Group>
            <Button component={Link} href="/" variant="subtle">
              Home
            </Button>
            <Button component={Link} href="/recipes" variant="subtle">
              Recipes
            </Button>
            <Button component={Link} href="/items" variant="subtle">
              Items
            </Button>
          </Group>
          
          <ActionIcon
            onClick={toggleColorScheme}
            variant="subtle"
            size="lg"
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
        </Group>
      </Container>
    </Box>
  )
}
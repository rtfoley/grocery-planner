// src/Components/Navigation.tsx
'use client'

import { Container, Group, Button, Box, ActionIcon, useMantineColorScheme, Burger, Drawer, Stack } from '@mantine/core'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import Link from 'next/link'

export function Navigation() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const [opened, { open, close }] = useDisclosure(false)

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/recipes', label: 'Recipes' },
    { href: '/items', label: 'Items' },
    { href: '/store-order', label: 'Store Order' }
  ]

  return (
    <Box style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', marginBottom: '1rem' }}>
      <Container size="lg">
        <Group h={60} justify="space-between">
          {/* Desktop navigation */}
          <Group visibleFrom="sm">
            {navItems.map((item) => (
              <Button key={item.href} component={Link} href={item.href} variant="subtle">
                {item.label}
              </Button>
            ))}
          </Group>
          
          {/* Mobile burger menu */}
          <Burger opened={opened} onClick={open} hiddenFrom="sm" size="sm" />
          
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

      {/* Mobile drawer */}
      <Drawer opened={opened} onClose={close} title="Navigation" hiddenFrom="sm">
        <Stack>
          {navItems.map((item) => (
            <Button 
              key={item.href} 
              component={Link} 
              href={item.href} 
              variant="subtle" 
              onClick={close}
              justify="flex-start"
            >
              {item.label}
            </Button>
          ))}
        </Stack>
      </Drawer>
    </Box>
  )
}
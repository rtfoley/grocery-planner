// src/Components/Navigation.tsx
'use client'

import { Container, Group, Button, Box, ActionIcon, useMantineColorScheme, Burger, Drawer, Stack, Text, Menu, Badge } from '@mantine/core'
import { IconSun, IconMoon, IconLogout, IconUser, IconUsers } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { notifications } from '@mantine/notifications'
import { useUserGroup } from '@/lib/hooks/useUserGroup'
import Link from 'next/link'

export function Navigation() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const [opened, { open, close }] = useDisclosure(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const { groupName } = useUserGroup()
  const router = useRouter()

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/recipes', label: 'Recipes' },
    { href: '/items', label: 'Items' },
    { href: '/store-order', label: 'Store Order' }
  ]

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      })
    } else {
      notifications.show({
        title: 'Success',
        message: 'Logged out successfully',
        color: 'green',
      })
      router.push('/login')
      router.refresh()
    }
  }

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

          {/* Right side: Group name, user menu and theme toggle */}
          <Group gap="xs">
            {groupName && (
              <Badge
                leftSection={<IconUsers size={14} />}
                variant="light"
                size="lg"
                visibleFrom="sm"
              >
                {groupName}
              </Badge>
            )}

            {userEmail && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="subtle" leftSection={<IconUser size={16} />}>
                    {userEmail}
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    onClick={handleLogout}
                    color="red"
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}

            <ActionIcon
              onClick={toggleColorScheme}
              variant="subtle"
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
          </Group>
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

          {userEmail && (
            <>
              {groupName && (
                <Badge
                  leftSection={<IconUsers size={14} />}
                  variant="light"
                  size="lg"
                  mt="md"
                >
                  {groupName}
                </Badge>
              )}
              <Text size="sm" c="dimmed" mt="md" px="xs">
                Signed in as: {userEmail}
              </Text>
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconLogout size={16} />}
                onClick={() => {
                  close()
                  handleLogout()
                }}
                justify="flex-start"
              >
                Logout
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </Box>
  )
}
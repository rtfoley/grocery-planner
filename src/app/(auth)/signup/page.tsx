// src/app/(auth)/signup/page.tsx
'use client'

import {
  Paper,
  Title,
  Container,
  Text,
  Anchor,
  Stack,
  Alert
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <Container size={420} my={40}>
      <Title ta="center">Welcome to Grocery Planner</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" component={Link} href="/login">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} title="Signups Disabled" color="blue">
            Public signups are currently disabled. This is a private instance of Grocery Planner.
          </Alert>
        </Stack>
      </Paper>
    </Container>
  )
}
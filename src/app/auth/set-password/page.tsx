// src/app/auth/set-password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Text,
  Stack
} from '@mantine/core'
import { notifications } from '@mantine/notifications'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      notifications.show({
        title: 'Error',
        message: 'Passwords do not match',
        color: 'red',
      })
      return
    }

    if (password.length < 6) {
      notifications.show({
        title: 'Error',
        message: 'Password must be at least 6 characters',
        color: 'red',
      })
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      })
      setLoading(false)
    } else {
      notifications.show({
        title: 'Success',
        message: 'Password set successfully! Redirecting...',
        color: 'green',
      })
      router.push('/')
    }
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Set Your Password</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Choose a password for your new account
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSetPassword}>
          <Stack>
            <PasswordInput
              label="Password"
              placeholder="Choose a password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              description="Must be at least 6 characters"
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button type="submit" fullWidth loading={loading}>
              Set Password
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}

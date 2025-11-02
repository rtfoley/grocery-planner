// src/app/auth/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TextInput,
  Button,
  Paper,
  Title,
  Container,
  Text,
  Anchor,
  Stack
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })

    if (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      })
    } else {
      setSent(true)
      notifications.show({
        title: 'Success',
        message: 'Password reset email sent! Check your inbox.',
        color: 'green',
      })
    }

    setLoading(false)
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Reset Password</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Remember your password?{' '}
        <Anchor size="sm" component={Link} href="/login">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {sent ? (
          <Stack gap="md">
            <Text size="sm">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
            </Text>
            <Text size="sm" c="dimmed">
              Please check your inbox and click the link to reset your password.
              The link will expire in 1 hour.
            </Text>
            <Button component={Link} href="/login" variant="light" fullWidth>
              Return to Login
            </Button>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack>
              <Text size="sm" c="dimmed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </Text>

              <TextInput
                label="Email"
                placeholder="your@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />

              <Button type="submit" fullWidth loading={loading}>
                Send Reset Link
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  )
}

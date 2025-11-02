// src/Components/Footer.tsx
'use client'

import { Container, Text, Group, Anchor } from '@mantine/core'
import { useState } from 'react'
import { Modal } from '@mantine/core'

export function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)

  return (
    <>
      <Container size="xl" py="xl" mt="xl">
        <Group justify="center" gap="xl" style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
          <Text size="sm" c="dimmed">
            © 2025 Grocery Planner
          </Text>
          <Anchor
            size="sm"
            c="dimmed"
            onClick={() => setDisclaimerOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            Terms &amp; Disclaimer
          </Anchor>
        </Group>
      </Container>

      <Modal
        opened={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
        title="Terms & Disclaimer"
        size="lg"
      >
        <Text size="sm" mb="md" fw={600}>
          USE AT YOUR OWN RISK
        </Text>

        <Text size="sm" mb="md">
          This software is provided &quot;AS IS&quot; without warranty of any kind, express or implied,
          including but not limited to the warranties of merchantability, fitness for a particular
          purpose, and noninfringement.
        </Text>

        <Text size="sm" mb="md">
          The authors and contributors shall not be liable for any claim, damages, or other liability
          arising from the use of this software.
        </Text>

        <Text size="sm" fw={600} mb="xs">
          Your Responsibilities:
        </Text>
        <ul style={{ marginTop: 0, marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li><Text size="sm">Securing your account credentials</Text></li>
          <li><Text size="sm">Understanding the data privacy implications of cloud hosting</Text></li>
          <li><Text size="sm">Compliance with applicable data protection regulations</Text></li>
          <li><Text size="sm">Backing up your data if needed</Text></li>
        </ul>

        <Text size="sm" mb="md">
          This application handles user data including recipes, meal plans, and shopping information.
          By using this application, you acknowledge that you understand these terms and accept full
          responsibility for your use of the service.
        </Text>

        <Text size="sm" c="dimmed">
          Copyright © 2025. All rights reserved.
        </Text>
      </Modal>
    </>
  )
}

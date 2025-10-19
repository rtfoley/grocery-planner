// src/components/Providers.tsx
'use client'

import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Notifications />
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>
        {children}
      </DatesProvider>
    </MantineProvider>
  )
}
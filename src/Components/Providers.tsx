// src/components/Providers.tsx
'use client'

import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  )

  return (
    <MantineProvider defaultColorScheme="auto">
      <Notifications />
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>
        {children}
      </DatesProvider>
    </MantineProvider>
  )
}
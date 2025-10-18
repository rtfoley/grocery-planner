// src/components/Providers.tsx
'use client'

import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { supabase } from '@/lib/supabase'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <MantineProvider defaultColorScheme="auto">
        <Notifications />
        <DatesProvider settings={{ firstDayOfWeek: 0 }}>
          {children}
        </DatesProvider>
      </MantineProvider>
    </SessionContextProvider>
  )
}
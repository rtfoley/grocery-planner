// src/app/layout.tsx
import type { Metadata } from 'next'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Navigation } from '@/Components/Navigation'

export const metadata: Metadata = {
  title: 'Grocery Planner',
  description: 'Family meal planning and grocery list generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto">
          <Navigation />
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}
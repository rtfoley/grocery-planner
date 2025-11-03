// src/app/layout.tsx
import type { Metadata } from 'next'
import { ColorSchemeScript } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import { Navigation } from '@/Components/Navigation'
import { Footer } from '@/Components/Footer'
import { Providers } from '@/Components/Providers'
import { ErrorBoundary } from '@/Components/ErrorBoundary'

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
        <Providers>
          <ErrorBoundary>
            <Navigation />
            {children}
            <Footer />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
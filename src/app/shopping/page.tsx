// src/app/shopping/page.tsx
import { Container } from '@mantine/core'
import { getPlanningSessions } from '@/lib/actions'
import { ShoppingListView } from '@/Components/ShoppingListView'

interface ShoppingPageProps {
  searchParams: Promise<{ session?: string }>
}

export default async function ShoppingPage({ searchParams }: ShoppingPageProps) {
  const params = await searchParams
  const sessionId = params.session || null

  const sessions = await getPlanningSessions()

  return (
    <Container size="xl" py="xl">
      <ShoppingListView
        sessions={sessions}
        sessionId={sessionId}
      />
    </Container>
  )
}

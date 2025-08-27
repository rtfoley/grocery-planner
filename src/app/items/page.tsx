// src/app/items/page.tsx
import { Container, Title } from '@mantine/core'
import { getItems } from '@/lib/actions'
import { ItemsManager } from '@/Components/ItemsManager'

export default async function ItemsPage() {
  const items = await getItems()

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Items Management</Title>
      <ItemsManager items={items} />
    </Container>
  )
}
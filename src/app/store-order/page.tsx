// src/app/store-order/page.tsx
import { Container, Title } from '@mantine/core'
import { getItems } from '@/lib/actions'
import { StoreOrderManager } from '@/Components/StoreOrderManager'

export default async function StoreOrderPage() {
  const items = await getItems()

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Store Order</Title>
      <StoreOrderManager items={items} />
    </Container>
  )
}
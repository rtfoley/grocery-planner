// src/app/page.tsx
import { Title, Container, Text } from '@mantine/core'
import { getRecipes } from '@/lib/actions'

export default async function HomePage() {
  const recipes = await getRecipes()
  
  return (
    <Container size="lg" py="xl">
      <Title order={1}>Grocery Planner</Title>
      <Text>Welcome to your family meal planning tool!</Text>
      <Text>Current recipes: {recipes.length}</Text>
    </Container>
  )
}
// src/app/page.tsx
import { Container } from '@mantine/core'
import { getRecipes } from '@/lib/actions'
import { MealPlanner } from '@/components/MealPlanner'

export default async function HomePage() {
  const recipes = await getRecipes()
  
  return (
    <Container size="xl" py="xl">
      <MealPlanner recipes={recipes} />
    </Container>
  )
}
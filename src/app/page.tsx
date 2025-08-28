// src/app/page.tsx
import { Container } from '@mantine/core'
import { getRecipes, getItems } from '@/lib/actions'
import { MealPlanner } from '@/Components/MealPlanner'

export default async function HomePage() {
  const [recipes, items] = await Promise.all([
    getRecipes(),
    getItems()
  ])
  
  const staples = items.filter(item => item.is_staple)
  
  return (
    <Container size="xl" py="xl">
      <MealPlanner recipes={recipes} staples={staples} />
    </Container>
  )
}
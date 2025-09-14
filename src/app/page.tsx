// src/app/page.tsx
import { Container } from '@mantine/core'
import { getRecipes, getItems } from '@/lib/actions'
import { MealPlanner } from '@/Components/MealPlanner'

export default async function HomePage() {
  const [recipes, items] = await Promise.all([
    getRecipes(),
    getItems()
  ])
  
  return (
    <Container size="xl" py="xl">
      <MealPlanner 
        recipes={recipes} 
        allItems={items}
      />
    </Container>
  )
}
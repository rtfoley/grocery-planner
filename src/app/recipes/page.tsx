// src/app/recipes/page.tsx
import { Container } from '@mantine/core'
import { getRecipes } from '@/lib/actions'
import { RecipesList } from '@/Components/RecipesList'

export default async function RecipesPage() {
  const recipes = await getRecipes()

  return (
    <Container size="lg" py="xl">
      <RecipesList recipes={recipes} />
    </Container>
  )
}
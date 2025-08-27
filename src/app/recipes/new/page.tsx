// src/app/recipes/new/page.tsx
import { Container, Title } from '@mantine/core'
import { RecipeForm } from '@/Components/RecipeForm'

export default function NewRecipePage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Add New Recipe</Title>
      <RecipeForm />
    </Container>
  )
}
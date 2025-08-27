// src/app/recipes/[id]/page.tsx
import { Container, Title } from '@mantine/core'
import { notFound } from 'next/navigation'
import { getRecipe } from '@/lib/actions'
import { RecipeForm } from '@/Components/RecipeForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params
  const recipe = await getRecipe(parseInt(id))
  
  if (!recipe) {
    notFound()
  }

  const initialData = {
    name: recipe.name,
    ingredients: recipe.recipe_items.map(item => ({
      item: item.item.name,
      amount: item.amount || ''
    }))
  }

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Edit Recipe</Title>
      <RecipeForm initialData={initialData} isEdit recipeId={recipe.id} />
    </Container>
  )
}
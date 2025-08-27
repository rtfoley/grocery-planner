// src/app/recipes/page.tsx
import { Container, Title, Button, Group, ActionIcon } from '@mantine/core'
import { Table } from '@mantine/core'
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react'
import Link from 'next/link'
import { getRecipes } from '@/lib/actions'

export default async function RecipesPage() {
  const recipes = await getRecipes()

  const rows = recipes.map((recipe) => (
    <tr key={recipe.id}>
      <td>{recipe.name}</td>
      <td style={{ textAlign: 'center' }}>{recipe.recipe_items.length} ingredients</td>
      <td style={{ textAlign: 'right' }}>
        <Group gap="xs" justify="flex-end">
          <ActionIcon
            component={Link}
            href={`/recipes/${recipe.id}`}
            variant="subtle"
            color="blue"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red">
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </td>
    </tr>
  ))

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Recipes</Title>
        <Button
          component={Link}
          href="/recipes/new"
          leftSection={<IconPlus size={16} />}
        >
          Add Recipe
        </Button>
      </Group>

      {recipes.length === 0 ? (
        <p>No recipes yet. Add your first recipe to get started!</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Name</th>
              <th style={{ width: '30%', textAlign: 'center' }}>Ingredients</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      )}
    </Container>
  )
}
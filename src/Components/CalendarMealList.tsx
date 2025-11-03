// src/Components/CalendarMealList.tsx
'use client'

import { useMemo, useState } from 'react'
import { Card, Title, Text, Stack, Group, Button, Grid, ActionIcon } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { MealWithDetails, Item } from '@/lib/types'
import { MealCard } from './MealCard'
import { MealDialog, MealDialogData } from './MealDialog'
import { RecipeWithItems } from '@/lib/types'
import { getAdjustedDateFromString } from '@/lib/utilities'

interface CalendarMealListProps {
  meals: MealWithDetails[]
  sessionStartDate: string | null
  sessionEndDate: string | null
  recipes: RecipeWithItems[]
  allItems: Item[]
  onAddMeal: (date: string | null, mealData: MealDialogData) => Promise<void>
  onUpdateMeal: (mealId: string, mealData: MealDialogData) => Promise<void>
  onDeleteMeal: (mealId: string) => Promise<void>
}

interface CalendarDay {
  date: string
  dayOfWeek: number // 0 = Sunday
  meals: MealWithDetails[]
}

export function CalendarMealList({
  meals,
  sessionStartDate,
  sessionEndDate,
  recipes,
  allItems,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal
}: CalendarMealListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealWithDetails | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Generate calendar grid (starts on Sunday, only includes session dates)
  const calendarDays = useMemo((): CalendarDay[] => {
    if (!sessionStartDate || !sessionEndDate) return []

    const start = getAdjustedDateFromString(sessionStartDate)
    const end = getAdjustedDateFromString(sessionEndDate)

    // Find the Sunday before or on start date
    const calendarStart = new Date(start)
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())

    // Find the Saturday after or on end date
    const calendarEnd = new Date(end)
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))

    const days: CalendarDay[] = []
    const current = new Date(calendarStart)

    while (current <= calendarEnd) {
      const dateStr = current.toISOString().split('T')[0]
      const isInSession = current >= start && current <= end

      // Only add days that are in the session (gray out others)
      days.push({
        date: dateStr,
        dayOfWeek: current.getDay(),
        meals: isInSession ? meals.filter(m => m.date === dateStr) : []
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }, [sessionStartDate, sessionEndDate, meals])

  // Group meals without dates (Additional Meals)
  const additionalMeals = meals.filter(m => !m.date)

  // Group calendar days into weeks
  const weeks = useMemo(() => {
    const weeksArray: CalendarDay[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7))
    }
    return weeksArray
  }, [calendarDays])

  const handleOpenDialog = (date: string | null, meal: MealWithDetails | null = null) => {
    setSelectedDate(date)
    setEditingMeal(meal)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingMeal(null)
    setSelectedDate(null)
  }

  const handleSaveMeal = async (mealData: MealDialogData) => {
    if (editingMeal) {
      await onUpdateMeal(editingMeal.id, mealData)
    } else {
      await onAddMeal(selectedDate, mealData)
    }
    handleCloseDialog()
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Check if date is in session
  const isDateInSession = (dateStr: string) => {
    if (!sessionStartDate || !sessionEndDate) return false
    const date = getAdjustedDateFromString(dateStr)
    const start = getAdjustedDateFromString(sessionStartDate)
    const end = getAdjustedDateFromString(sessionEndDate)
    return date >= start && date <= end
  }

  return (
    <Stack gap="md">
      <MealDialog
        opened={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveMeal}
        meal={editingMeal}
        recipes={recipes}
        allItems={allItems}
      />

      <Card withBorder shadow="sm" padding="lg">
        <Stack gap="md">
          <Title order={3}>Meals</Title>

          {/* Calendar Grid */}
          <div>
            {/* Day headers */}
            <Grid gutter="xs" mb="xs">
              {dayNames.map(day => (
                <Grid.Col key={day} span={12 / 7}>
                  <Text size="xs" fw={600} ta="center" c="dimmed">
                    {day}
                  </Text>
                </Grid.Col>
              ))}
            </Grid>

            {/* Calendar days - grouped by week */}
            <Stack gap="xs">
              {weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 'var(--mantine-spacing-xs)',
                    gridAutoRows: '1fr'
                  }}
                >
                  {week.map((day) => {
                    const date = getAdjustedDateFromString(day.date)
                    const dayOfMonth = date.getDate()
                    const monthShort = date.toLocaleDateString('en-US', { month: 'short' })
                    const inSession = isDateInSession(day.date)

                    return (
                      <Card
                        key={day.date}
                        withBorder
                        padding="xs"
                        style={{
                          minHeight: 120,
                          opacity: inSession ? 1 : 0.4,
                          cursor: inSession ? 'default' : 'not-allowed',
                          pointerEvents: inSession ? 'auto' : 'none',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <Stack gap={6}>
                          {/* Date header */}
                          <Group justify="space-between" align="flex-start">
                            <div>
                              <Text size="md" fw={700} c={inSession ? undefined : 'dimmed'}>
                                {monthShort} {dayOfMonth}
                              </Text>
                            </div>
                            {inSession && (
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                onClick={() => handleOpenDialog(day.date)}
                              >
                                <IconPlus size={16} />
                              </ActionIcon>
                            )}
                          </Group>

                          {/* Meals for this day */}
                          {inSession && (
                            <Stack gap={6}>
                              {day.meals.map(meal => (
                                <MealCard
                                  key={meal.id}
                                  meal={meal}
                                  onEdit={(m) => handleOpenDialog(day.date, m)}
                                  onDelete={onDeleteMeal}
                                />
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      </Card>
                    )
                  })}
                </div>
              ))}
            </Stack>
          </div>

          {/* Additional Meals (no date) */}
          <Stack gap="sm" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
            <Group justify="space-between">
              <Title order={5}>Additional Meals</Title>
              <Button
                size="compact-sm"
                variant="subtle"
                leftSection={<IconPlus size={14} />}
                onClick={() => handleOpenDialog(null)}
              >
                Add
              </Button>
            </Group>
            {additionalMeals.length > 0 ? (
              <Stack gap="xs">
                {additionalMeals.map(meal => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onEdit={(m) => handleOpenDialog(null, m)}
                    onDelete={onDeleteMeal}
                  />
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                No additional meals
              </Text>
            )}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

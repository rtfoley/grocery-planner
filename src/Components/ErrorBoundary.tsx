// src/Components/ErrorBoundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Container, Title, Text, Button, Stack, Paper } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console (in production, you'd send to an error tracking service)
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="sm" mt="xl">
          <Paper p="xl" withBorder>
            <Stack align="center" gap="lg">
              <IconAlertTriangle size={48} color="red" />
              <Title order={2}>Something went wrong</Title>
              <Text c="dimmed" ta="center">
                We apologize for the inconvenience. An unexpected error has occurred.
              </Text>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Paper p="md" bg="gray.1" style={{ width: '100%', maxHeight: '200px', overflow: 'auto' }}>
                  <Text size="sm" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </Text>
                </Paper>
              )}
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
              >
                Reload Page
              </Button>
            </Stack>
          </Paper>
        </Container>
      )
    }

    return this.props.children
  }
}

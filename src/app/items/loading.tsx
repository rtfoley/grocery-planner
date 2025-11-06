import { Container, Center, Loader } from '@mantine/core'

// TODO remove?
export default function Loading() {
  return (
    <Container size="lg" py="xl">
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    </Container>
  )
}

import { Suspense } from 'react'
import { Container, Loader, Center } from '@mantine/core'
import { TimetablePageContent } from './TimetablePageContent'

export default function TimetablePage() {
  return (
    <Container size="sm" py="md">
      <Suspense
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        <TimetablePageContent />
      </Suspense>
    </Container>
  )
}

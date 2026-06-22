import { Container, Title, Stack } from '@mantine/core'
import { FavoritesList } from '@/components/favorites/FavoritesList'

export default function FavoritesPage() {
  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2} size="h3">
          よく使うルート
        </Title>
        <FavoritesList />
      </Stack>
    </Container>
  )
}

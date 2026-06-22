import { Container, Title, Text, Stack } from '@mantine/core'

export default function SearchPage() {
  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={1} size="h3">市バスかんたん時刻表</Title>
        <Text c="dimmed" size="sm">直通ルート検索</Text>
      </Stack>
    </Container>
  )
}

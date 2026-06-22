'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Stack,
  Button,
  Text,
  Center,
  Group,
  rem,
} from '@mantine/core'
import { IconStar, IconPlus } from '@tabler/icons-react'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  reverseFavorite,
  type FavoriteRoute,
} from '@/lib/favorites/local-storage'
import { FavoriteCard } from './FavoriteCard'

// モック追加用のサンプルルートリスト
const MOCK_ROUTES: Array<{ from: string; to: string }> = [
  { from: '栄', to: '名古屋駅' },
  { from: '上浜町', to: '金山' },
  { from: '大曽根', to: '栄' },
  { from: '千種駅', to: '覚王山' },
  { from: '本山', to: '藤が丘' },
]

export function FavoritesList() {
  const router = useRouter()
  const [routes, setRoutes] = useState<FavoriteRoute[]>(() => getFavorites())
  const [mockIndex, setMockIndex] = useState(0)

  const handleReverse = useCallback((id: string) => {
    reverseFavorite(id)
    setRoutes(getFavorites())
  }, [])

  const handleDelete = useCallback((id: string) => {
    removeFavorite(id)
    setRoutes(getFavorites())
  }, [])

  const handleCardClick = useCallback(
    (route: FavoriteRoute) => {
      const params = new URLSearchParams({
        from: route.fromStopName,
        to: route.toStopName,
      })
      router.push(`/?${params.toString()}`)
    },
    [router]
  )

  const handleAddMock = useCallback(() => {
    const mock = MOCK_ROUTES[mockIndex % MOCK_ROUTES.length]
    addFavorite(mock.from, mock.to)
    setRoutes(getFavorites())
    setMockIndex((prev) => prev + 1)
  }, [mockIndex])

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text c="dimmed" size="sm">
          {routes.length > 0
            ? `${routes.length}件のルート`
            : 'ルートはまだありません'}
        </Text>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={rem(14)} />}
          onClick={handleAddMock}
        >
          追加
        </Button>
      </Group>

      {routes.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconStar
              size={rem(48)}
              color="var(--mantine-color-gray-4)"
              stroke={1.2}
            />
            <Text c="dimmed" size="sm" ta="center">
              よく使うルートを追加しましょう
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              「追加」ボタンでサンプルルートを追加できます
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="sm">
          {routes.map((route) => (
            <FavoriteCard
              key={route.id}
              route={route}
              onReverse={handleReverse}
              onDelete={handleDelete}
              onClick={handleCardClick}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Stack,
  Text,
  Center,
  rem,
} from '@mantine/core'
import { IconStar } from '@tabler/icons-react'
import {
  getFavorites,
  removeFavorite,
  reverseFavorite,
  type FavoriteRoute,
} from '@/lib/favorites/local-storage'
import { FavoriteCard } from './FavoriteCard'

export function FavoritesList() {
  const router = useRouter()
  const [routes, setRoutes] = useState<FavoriteRoute[]>(() => getFavorites())

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
        area: route.areaId,
      })
      router.push(`/?${params.toString()}`)
    },
    [router]
  )

  const handleTimetable = useCallback(
    (route: FavoriteRoute) => {
      router.push(`/timetable?stopName=${encodeURIComponent(route.fromStopName)}`)
    },
    [router]
  )

  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        {routes.length > 0
          ? `${routes.length}件のルート`
          : 'ルートはまだありません'}
      </Text>

      {routes.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconStar
              size={rem(48)}
              color="var(--mantine-color-gray-4)"
              stroke={1.2}
            />
            <Text c="dimmed" size="sm" ta="center">
              よく使うルートを登録できます
            </Text>
            <Text c="dimmed" size="xs" ta="center">
              検索結果画面のスターボタンから追加してください
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
              onTimetable={handleTimetable}
              onClick={handleCardClick}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}

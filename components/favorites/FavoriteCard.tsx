'use client'

import {
  Card,
  Group,
  Text,
  ActionIcon,
  Stack,
  rem,
} from '@mantine/core'
import {
  IconArrowRight,
  IconArrowLeftRight,
  IconTrash,
} from '@tabler/icons-react'
import type { FavoriteRoute } from '@/lib/favorites/local-storage'

interface FavoriteCardProps {
  route: FavoriteRoute
  onReverse: (id: string) => void
  onDelete: (id: string) => void
  onClick: (route: FavoriteRoute) => void
}

export function FavoriteCard({
  route,
  onReverse,
  onDelete,
  onClick,
}: FavoriteCardProps) {
  return (
    <Card
      shadow="xs"
      radius="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(route)}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        {/* ルート情報 */}
        <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" style={{ flexShrink: 0 }}>
            {route.fromStopName}
          </Text>
          <IconArrowRight
            size={rem(16)}
            color="var(--mantine-color-blue-5)"
            style={{ flexShrink: 0 }}
          />
          <Text fw={600} size="sm" style={{ flexShrink: 0 }}>
            {route.toStopName}
          </Text>
        </Group>

        {/* アクションボタン */}
        <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <ActionIcon
            variant="subtle"
            color="blue"
            size="md"
            aria-label="行き帰りを入れ替え"
            onClick={() => onReverse(route.id)}
          >
            <IconArrowLeftRight size={rem(16)} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="md"
            aria-label="削除"
            onClick={() => onDelete(route.id)}
          >
            <IconTrash size={rem(16)} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  )
}

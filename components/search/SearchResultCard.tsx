import { Card, Group, Text, Badge, Stack, Box, rem } from '@mantine/core'
import { IconBus, IconClock } from '@tabler/icons-react'

export interface SearchResultCardProps {
  routeShortName: string
  headsign: string
  departureTime: string
  arrivalTime: string
  minutesUntil: number | null
  rideMinutes: number
  isNext?: boolean
  isLast?: boolean
}

function urgencyColor(minutes: number): string {
  if (minutes < 2) return 'red'
  if (minutes < 10) return 'orange'
  return 'blue'
}

function TimeArrow({ rideMinutes }: { rideMinutes: number }) {
  return (
    <Box style={{ flex: 1, display: 'flex', alignItems: 'center', gap: rem(4), padding: `0 ${rem(4)}` }}>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--mantine-color-gray-3)' }} />
      <Group gap={2} align="center" wrap="nowrap">
        <IconClock size={rem(11)} color="var(--mantine-color-gray-5)" stroke={1.5} />
        <Text size="xs" c="dimmed">{rideMinutes}分</Text>
      </Group>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--mantine-color-gray-3)' }} />
    </Box>
  )
}

export function SearchResultCard({
  routeShortName,
  headsign,
  departureTime,
  arrivalTime,
  minutesUntil,
  rideMinutes,
  isNext = false,
  isLast = false,
}: SearchResultCardProps) {
  if (isNext) {
    return (
      <Card
        shadow="sm"
        radius="md"
        withBorder
        style={{
          borderColor: 'var(--mantine-color-blue-4)',
          borderWidth: 2,
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
              <IconBus size={rem(18)} color="var(--mantine-color-blue-6)" stroke={1.5} style={{ flexShrink: 0 }} />
              <Text fw={700} c="blue.7" size="sm" style={{ flexShrink: 0 }}>
                {routeShortName}
              </Text>
              <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {headsign} 行き
              </Text>
            </Group>
            {minutesUntil !== null && (
              <Badge color={urgencyColor(minutesUntil)} variant="filled" size="lg" radius="sm" style={{ flexShrink: 0 }}>
                あと {minutesUntil} 分
              </Badge>
            )}
          </Group>

          <Group justify="space-between" align="center" wrap="nowrap" gap={0}>
            <Stack gap={2} align="center" style={{ minWidth: rem(60) }}>
              <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
                {departureTime}
              </Text>
              <Text size="xs" c="dimmed">発</Text>
            </Stack>

            <TimeArrow rideMinutes={rideMinutes} />

            <Stack gap={2} align="center" style={{ minWidth: rem(60) }}>
              <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
                {arrivalTime}
              </Text>
              <Text size="xs" c="dimmed">着</Text>
            </Stack>
          </Group>
        </Stack>
      </Card>
    )
  }

  if (isLast) {
    return (
      <Card
        shadow="none"
        radius="md"
        withBorder
        style={{
          borderColor: 'var(--mantine-color-gray-3)',
          backgroundColor: 'var(--mantine-color-gray-0)',
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
            <IconBus size={rem(16)} color="var(--mantine-color-gray-5)" stroke={1.5} style={{ flexShrink: 0 }} />
            <Text size="sm" c="dimmed" fw={600} style={{ flexShrink: 0 }}>
              {routeShortName}
            </Text>
            <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {headsign} 行き
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Stack gap={0} align="center">
              <Text size="sm" c="dimmed" fw={600}>{departureTime}</Text>
              <Text size="xs" c="dimmed">発</Text>
            </Stack>
            <Text size="xs" c="dimmed">→</Text>
            <Stack gap={0} align="center">
              <Text size="sm" c="dimmed" fw={600}>{arrivalTime}</Text>
              <Text size="xs" c="dimmed">着</Text>
            </Stack>
          </Group>
        </Group>
      </Card>
    )
  }

  // 通常の候補
  return (
    <Card shadow="none" radius="md" withBorder>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
          <IconBus size={rem(16)} color="var(--mantine-color-blue-5)" stroke={1.5} style={{ flexShrink: 0 }} />
          <Text size="sm" fw={600} c="blue.6" style={{ flexShrink: 0 }}>
            {routeShortName}
          </Text>
          <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {headsign} 行き
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Stack gap={0} align="center">
            <Text size="md" fw={700}>{departureTime}</Text>
            <Text size="xs" c="dimmed">発</Text>
          </Stack>
          <Text size="xs" c="dimmed">→</Text>
          <Stack gap={0} align="center">
            <Text size="md" fw={700}>{arrivalTime}</Text>
            <Text size="xs" c="dimmed">着</Text>
          </Stack>
          {minutesUntil !== null && (
            <Badge color={urgencyColor(minutesUntil)} variant="light" size="sm" radius="sm">
              {minutesUntil}分後
            </Badge>
          )}
        </Group>
      </Group>
    </Card>
  )
}

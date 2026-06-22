import { Card, Group, Text, Badge, Stack, Divider, rem } from '@mantine/core'
import { IconClock, IconBus } from '@tabler/icons-react'

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
          <Group justify="space-between" align="flex-start">
            <Group gap="xs">
              <IconBus size={rem(18)} color="var(--mantine-color-blue-6)" stroke={1.5} />
              <Text fw={700} c="blue.7" size="sm">
                {routeShortName}
              </Text>
              <Text size="sm" c="dimmed">
                {headsign} 行き
              </Text>
            </Group>
            <Badge color="blue" variant="filled" size="lg" radius="sm">
              あと {minutesUntil} 分
            </Badge>
          </Group>

          <Divider />

          <Group justify="space-between" align="center">
            <Stack gap={2} align="center">
              <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
                {departureTime}
              </Text>
              <Text size="xs" c="dimmed">発</Text>
            </Stack>

            <Stack gap={2} align="center">
              <Group gap={4} align="center">
                <IconClock size={rem(14)} color="var(--mantine-color-gray-5)" stroke={1.5} />
                <Text size="xs" c="dimmed">{rideMinutes}分</Text>
              </Group>
              <Text size="xs" c="dimmed">──────</Text>
            </Stack>

            <Stack gap={2} align="center">
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
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconBus size={rem(16)} color="var(--mantine-color-gray-5)" stroke={1.5} />
            <Text size="sm" c="dimmed" fw={600}>
              {routeShortName}
            </Text>
            <Text size="sm" c="dimmed">
              {headsign} 行き
            </Text>
          </Group>
          <Group gap="lg">
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
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconBus size={rem(16)} color="var(--mantine-color-blue-5)" stroke={1.5} />
          <Text size="sm" fw={600} c="blue.6">
            {routeShortName}
          </Text>
          <Text size="sm" c="dimmed">
            {headsign} 行き
          </Text>
        </Group>
        <Group gap="md" align="center">
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
            <Badge color="teal" variant="light" size="sm" radius="sm">
              {minutesUntil}分後
            </Badge>
          )}
        </Group>
      </Group>
    </Card>
  )
}

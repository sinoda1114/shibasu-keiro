'use client'

import { useState } from 'react'
import { Card, Group, Text, Badge, Stack, Box, Divider, rem, UnstyledButton } from '@mantine/core'
import { IconBus, IconClock, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { BusStopProgress } from './BusStopProgress'

export interface SearchResultCardProps {
  routeShortName: string
  headsign: string
  departureTime: string
  arrivalTime: string
  minutesUntil: number | null
  rideMinutes: number
  isNext?: boolean
  isLast?: boolean
  tripId?: string
  fromStopName?: string
  toStopName?: string
  date?: string
  provider?: string
  providerDisplayName?: string
}

function urgencyColor(minutes: number): string {
  if (minutes < 2) return 'red'
  if (minutes < 10) return 'orange'
  return 'blue'
}

const ROUTE_COLORS = ['red', 'pink', 'grape', 'violet', 'indigo', 'cyan', 'teal', 'green', 'lime', 'yellow', 'orange'] as const

function routeColor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return ROUTE_COLORS[h % ROUTE_COLORS.length]
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
  tripId,
  fromStopName,
  toStopName,
  date,
  provider = '',
  providerDisplayName,
}: SearchResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = !!(tripId && fromStopName && toStopName && date)
  if (isNext) {
    const color = routeColor(routeShortName)
    return (
      <Card
        shadow="sm"
        radius="md"
        withBorder
        style={{
          borderColor: `var(--mantine-color-${color}-4)`,
          borderWidth: 2,
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
              <IconBus size={rem(18)} color={`var(--mantine-color-${color}-6)`} stroke={1.5} style={{ flexShrink: 0 }} />
              <Text fw={700} c={`${color}.7`} size="sm" style={{ flexShrink: 0 }}>
                {routeShortName}
              </Text>
              <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {headsign} 行き
              </Text>
              {providerDisplayName && (
                <Badge size="xs" variant="light" color="blue" radius="sm" style={{ flexShrink: 0 }}>
                  {providerDisplayName}
                </Badge>
              )}
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

          {canExpand && (
            <>
              <Divider />
              <UnstyledButton
                onClick={() => setExpanded((e) => !e)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: rem(4), width: '100%', padding: `${rem(2)} 0` }}
              >
                <Text size="xs" c="blue.5">経路の詳細</Text>
                {expanded
                  ? <IconChevronUp size={rem(13)} color="var(--mantine-color-blue-5)" />
                  : <IconChevronDown size={rem(13)} color="var(--mantine-color-blue-5)" />
                }
              </UnstyledButton>
              {expanded && (
                <BusStopProgress
                  tripId={tripId!}
                  fromStopName={fromStopName!}
                  toStopName={toStopName!}
                  date={date!}
                  provider={provider}
                />
              )}
            </>
          )}
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
            {providerDisplayName && (
              <Badge size="xs" variant="light" color="blue" radius="sm" style={{ flexShrink: 0 }}>
                {providerDisplayName}
              </Badge>
            )}
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
  const color = routeColor(routeShortName)
  return (
    <Card shadow="none" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
            <IconBus size={rem(16)} color={`var(--mantine-color-${color}-5)`} stroke={1.5} style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} c={`${color}.6`} style={{ flexShrink: 0 }}>
              {routeShortName}
            </Text>
            <Text size="sm" c="dimmed" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {headsign} 行き
            </Text>
            {providerDisplayName && (
              <Badge size="xs" variant="light" color="blue" radius="sm" style={{ flexShrink: 0 }}>
                {providerDisplayName}
              </Badge>
            )}
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

        {canExpand && (
          <>
            <Divider />
            <UnstyledButton
              onClick={() => setExpanded((e) => !e)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: rem(4), width: '100%', padding: `${rem(2)} 0` }}
            >
              <Text size="xs" c="blue.5">経路の詳細</Text>
              {expanded
                ? <IconChevronUp size={rem(13)} color="var(--mantine-color-blue-5)" />
                : <IconChevronDown size={rem(13)} color="var(--mantine-color-blue-5)" />
              }
            </UnstyledButton>
            {expanded && (
              <BusStopProgress
                tripId={tripId!}
                fromStopName={fromStopName!}
                toStopName={toStopName!}
                date={date!}
                provider={provider}
              />
            )}
          </>
        )}
      </Stack>
    </Card>
  )
}

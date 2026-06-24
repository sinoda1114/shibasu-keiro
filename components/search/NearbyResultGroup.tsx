'use client'

import { Stack, Text, Badge, Group, Card, rem } from '@mantine/core'
import { IconMapPin } from '@tabler/icons-react'
import { SearchResultCard } from './SearchResultCard'
import type { NearbyTrip } from '@/app/api/routes/nearby/route'

interface NearbyResultGroupProps {
  stopName: string
  distanceM: number
  trips: NearbyTrip[]
  toStopName: string
  date: string
  currentSeconds: number | null
}

function walkMinutes(distanceM: number): number {
  return Math.ceil(distanceM / 67) // 徒歩速度 80m/分 ≒ 67m/分（余裕を持たせる）
}

function calcMinutesUntil(depSec: number, nowSec: number): number | null {
  const diff = Math.floor((depSec - nowSec) / 60)
  return diff >= 0 ? diff : null
}

function calcRideMinutes(depSec: number, arrSec: number): number {
  return Math.round((arrSec - depSec) / 60)
}

export function NearbyResultGroup({
  stopName,
  distanceM,
  trips,
  toStopName,
  date,
  currentSeconds,
}: NearbyResultGroupProps) {
  const walk = walkMinutes(distanceM)
  const [nextBus, ...rest] = trips.slice(0, 5)

  return (
    <Stack gap="xs">
      <Group gap="xs" align="center">
        <IconMapPin size={rem(16)} color="var(--mantine-color-blue-6)" />
        <Text fw={700} size="sm">
          {stopName}
        </Text>
        <Badge variant="light" color="gray" size="sm" radius="sm">
          {distanceM}m・徒歩{walk}分
        </Badge>
      </Group>

      <Card withBorder radius="md" p="xs">
        <Stack gap="xs">
          {nextBus && (
            <SearchResultCard
              routeShortName={nextBus.routeId}
              headsign={nextBus.headsign ?? ''}
              departureTime={nextBus.departureTime}
              arrivalTime={nextBus.arrivalTime}
              minutesUntil={currentSeconds !== null ? calcMinutesUntil(nextBus.departureSeconds, currentSeconds) : null}
              rideMinutes={calcRideMinutes(nextBus.departureSeconds, nextBus.arrivalSeconds)}
              isNext
              tripId={nextBus.tripId}
              fromStopName={stopName}
              toStopName={toStopName}
              date={date}
            />
          )}
          {rest.map((bus) => (
            <SearchResultCard
              key={bus.tripId}
              routeShortName={bus.routeId}
              headsign={bus.headsign ?? ''}
              departureTime={bus.departureTime}
              arrivalTime={bus.arrivalTime}
              minutesUntil={currentSeconds !== null ? calcMinutesUntil(bus.departureSeconds, currentSeconds) : null}
              rideMinutes={calcRideMinutes(bus.departureSeconds, bus.arrivalSeconds)}
              tripId={bus.tripId}
              fromStopName={stopName}
              toStopName={toStopName}
              date={date}
            />
          ))}
        </Stack>
      </Card>
    </Stack>
  )
}

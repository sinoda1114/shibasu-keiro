'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  Button,
  Divider,
  Badge,
  Alert,
  rem,
} from '@mantine/core'
import { IconArrowLeft, IconAlertCircle, IconBus } from '@tabler/icons-react'
import { SearchResultCard } from '@/components/search/SearchResultCard'
import { Suspense } from 'react'

const MOCK_RESULTS = [
  {
    tripId: 't1',
    routeShortName: '基幹2',
    headsign: '名古屋駅',
    departureTime: '18:12',
    arrivalTime: '18:34',
    minutesUntil: 8,
    rideMinutes: 22,
  },
  {
    tripId: 't2',
    routeShortName: '基幹2',
    headsign: '名古屋駅',
    departureTime: '18:27',
    arrivalTime: '18:49',
    minutesUntil: 23,
    rideMinutes: 22,
  },
  {
    tripId: 't3',
    routeShortName: '基幹2',
    headsign: '名古屋駅',
    departureTime: '18:45',
    arrivalTime: '19:07',
    minutesUntil: 41,
    rideMinutes: 22,
  },
]

const MOCK_LAST = {
  tripId: 'tlast',
  routeShortName: '基幹2',
  headsign: '名古屋駅',
  departureTime: '23:10',
  arrivalTime: '23:32',
  minutesUntil: null,
  rideMinutes: 22,
}

const DAY_TYPE_LABELS: Record<string, string> = {
  weekday: '平日',
  saturday: '土曜',
  holiday: '休日',
}

function SearchResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const dayType = searchParams.get('dayType') ?? 'weekday'
  const time = searchParams.get('time') ?? ''

  const hasResults = MOCK_RESULTS.length > 0
  const [nextBus, ...otherBuses] = MOCK_RESULTS

  return (
    <Container size="sm" py="md" px="md">
      <Stack gap="md">
        {/* ヘッダー */}
        <Group gap="xs" align="center">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconArrowLeft size={rem(14)} stroke={2} />}
            onClick={() => router.back()}
            px={4}
          >
            検索に戻る
          </Button>
        </Group>

        {/* 検索条件の概要 */}
        <Stack gap={4}>
          <Group gap="xs" align="center">
            <IconBus size={rem(18)} color="var(--mantine-color-blue-6)" stroke={1.5} />
            <Title order={2} size="h4" fw={800}>
              {from} → {to}
            </Title>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="gray" size="sm" radius="sm">
              {DAY_TYPE_LABELS[dayType] ?? dayType}
            </Badge>
            {time && (
              <Badge variant="light" color="gray" size="sm" radius="sm">
                {time} 以降
              </Badge>
            )}
          </Group>
        </Stack>

        {/* 結果なし */}
        {!hasResults && (
          <Alert
            icon={<IconAlertCircle size={rem(16)} />}
            title="バスが見つかりませんでした"
            color="orange"
            radius="md"
          >
            この時間帯に運行するバスはありません。ダイヤ区分や時刻を変えてお試しください。
          </Alert>
        )}

        {/* 次のバス（強調表示） */}
        {hasResults && nextBus && (
          <Stack gap="xs">
            <Text size="sm" fw={700} c="blue.7">
              次に乗れるバス
            </Text>
            <SearchResultCard
              routeShortName={nextBus.routeShortName}
              headsign={nextBus.headsign}
              departureTime={nextBus.departureTime}
              arrivalTime={nextBus.arrivalTime}
              minutesUntil={nextBus.minutesUntil}
              rideMinutes={nextBus.rideMinutes}
              isNext
            />
          </Stack>
        )}

        {/* 2本目以降の候補 */}
        {hasResults && otherBuses.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              その後のバス
            </Text>
            <Stack gap="xs">
              {otherBuses.map((bus) => (
                <SearchResultCard
                  key={bus.tripId}
                  routeShortName={bus.routeShortName}
                  headsign={bus.headsign}
                  departureTime={bus.departureTime}
                  arrivalTime={bus.arrivalTime}
                  minutesUntil={bus.minutesUntil}
                  rideMinutes={bus.rideMinutes}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {/* 終バス */}
        {hasResults && (
          <>
            <Divider label="終バス" labelPosition="left" c="dimmed" />
            <SearchResultCard
              routeShortName={MOCK_LAST.routeShortName}
              headsign={MOCK_LAST.headsign}
              departureTime={MOCK_LAST.departureTime}
              arrivalTime={MOCK_LAST.arrivalTime}
              minutesUntil={MOCK_LAST.minutesUntil}
              rideMinutes={MOCK_LAST.rideMinutes}
              isLast
            />
          </>
        )}
      </Stack>
    </Container>
  )
}

export default function SearchResultPage() {
  return (
    <Suspense
      fallback={
        <Container size="sm" py="md" px="md">
          <Text c="dimmed">読み込み中...</Text>
        </Container>
      }
    >
      <SearchResultContent />
    </Suspense>
  )
}

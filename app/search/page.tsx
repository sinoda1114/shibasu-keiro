'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  Loader,
  Center,
  ActionIcon,
  rem,
} from '@mantine/core'
import { IconArrowLeft, IconAlertCircle, IconBus, IconStar, IconClock } from '@tabler/icons-react'
import { addFavorite, removeFavorite, getFavorites } from '@/lib/favorites/local-storage'
import { SearchResultCard } from '@/components/search/SearchResultCard'
import { Suspense } from 'react'

interface DirectRouteResult {
  tripId: string
  routeId: string
  headsign: string | null
  departureStopName: string
  arrivalStopName: string
  departureTime: string
  arrivalTime: string
  departureSeconds: number
  arrivalSeconds: number
}

const DAY_TYPE_LABELS: Record<string, string> = {
  weekday: '平日',
  saturday: '土曜',
  holiday: '休日',
}

function formatYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function getDayTypeDate(dayType: string): string {
  const today = new Date()
  const jst = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const dow = jst.getUTCDay() // 0=日, 1=月, ..., 6=土

  if (dayType === 'saturday') {
    const daysUntilSat = dow === 6 ? 0 : (6 - dow)
    const sat = new Date(jst.getTime() + daysUntilSat * 86400000)
    return formatYYYYMMDD(sat)
  }
  if (dayType === 'holiday') {
    const daysUntilSun = dow === 0 ? 0 : (7 - dow)
    const sun = new Date(jst.getTime() + daysUntilSun * 86400000)
    return formatYYYYMMDD(sun)
  }
  // weekday: 今日が平日ならそのまま、土日なら次の月曜
  if (dow === 0) return formatYYYYMMDD(new Date(jst.getTime() + 86400000))
  if (dow === 6) return formatYYYYMMDD(new Date(jst.getTime() + 2 * 86400000))
  return formatYYYYMMDD(jst)
}

function timeToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 3600 + m * 60
}

function calcMinutesUntil(depSec: number): number | null {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const nowSec = jst.getUTCHours() * 3600 + jst.getUTCMinutes() * 60 + jst.getUTCSeconds()
  const diff = Math.floor((depSec - nowSec) / 60)
  return diff >= 0 ? diff : null
}

function calcRideMinutes(depSec: number, arrSec: number): number {
  return Math.round((arrSec - depSec) / 60)
}

function SearchResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const dayType = searchParams.get('dayType') ?? 'weekday'
  const time = searchParams.get('time') ?? ''
  const timeMode = searchParams.get('timeMode') ?? 'now'

  const [results, setResults] = useState<DirectRouteResult[]>([])
  const [loading, setLoading] = useState(!!(from && to))
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(() => {
    if (typeof window === 'undefined') return false
    return getFavorites().some(f => f.fromStopName === from && f.toStopName === to)
  })

  useEffect(() => {
    if (!from || !to) return
    const date = getDayTypeDate(dayType)
    const controller = new AbortController()
    fetch(
      `/api/routes/direct?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&provider=nagoya_city_bus`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((json: { success: boolean; data?: DirectRouteResult[]; error?: string }) => {
        if (json.success) setResults(json.data ?? [])
        else setError(json.error ?? '検索に失敗しました')
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('通信エラーが発生しました')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [from, to, dayType])

  const timeSeconds = timeToSeconds(time || '00:00')
  const upcoming = results.filter((r) => r.departureSeconds >= timeSeconds)
  const lastBus = results.length > 0 ? results[results.length - 1] : null

  const [nextBus, ...restBuses] = upcoming
  const otherBuses = restBuses.slice(0, 4)

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
            <ActionIcon
              variant={isFavorited ? 'filled' : 'subtle'}
              color="yellow"
              size="md"
              aria-label={isFavorited ? 'お気に入りを解除' : 'お気に入りに追加'}
              onClick={() => {
                if (isFavorited) {
                  const target = getFavorites().find(f => f.fromStopName === from && f.toStopName === to)
                  if (target) removeFavorite(target.id)
                  setIsFavorited(false)
                } else {
                  addFavorite(from, to)
                  setIsFavorited(true)
                }
              }}
            >
              <IconStar size={rem(16)} />
            </ActionIcon>
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
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconClock size={rem(12)} stroke={1.5} />}
            onClick={() => router.push(`/timetable?stopName=${encodeURIComponent(from)}`)}
            px={4}
          >
            {from}の時刻表を見る
          </Button>
        </Stack>

        {/* ローディング */}
        {loading && (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        )}

        {/* エラー */}
        {!loading && error && (
          <Alert
            icon={<IconAlertCircle size={rem(16)} />}
            title="エラーが発生しました"
            color="red"
            radius="md"
          >
            {error}
          </Alert>
        )}

        {/* 結果なし */}
        {!loading && !error && upcoming.length === 0 && (
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
        {!loading && !error && nextBus && (
          <Stack gap="xs">
            <Text size="sm" fw={700} c="blue.7">
              次に乗れるバス
            </Text>
            <SearchResultCard
              routeShortName={nextBus.routeId}
              headsign={nextBus.headsign ?? ''}
              departureTime={nextBus.departureTime}
              arrivalTime={nextBus.arrivalTime}
              minutesUntil={timeMode === 'now' ? calcMinutesUntil(nextBus.departureSeconds) : null}
              rideMinutes={calcRideMinutes(nextBus.departureSeconds, nextBus.arrivalSeconds)}
              isNext
            />
          </Stack>
        )}

        {/* 2本目以降の候補 */}
        {!loading && !error && otherBuses.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              その後のバス
            </Text>
            <Stack gap="xs">
              {otherBuses.map((bus) => (
                <SearchResultCard
                  key={bus.tripId}
                  routeShortName={bus.routeId}
                  headsign={bus.headsign ?? ''}
                  departureTime={bus.departureTime}
                  arrivalTime={bus.arrivalTime}
                  minutesUntil={timeMode === 'now' ? calcMinutesUntil(bus.departureSeconds) : null}
                  rideMinutes={calcRideMinutes(bus.departureSeconds, bus.arrivalSeconds)}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {/* 終バス */}
        {!loading && !error && lastBus && (
          <>
            <Divider label="終バス" labelPosition="left" c="dimmed" />
            <SearchResultCard
              routeShortName={lastBus.routeId}
              headsign={lastBus.headsign ?? ''}
              departureTime={lastBus.departureTime}
              arrivalTime={lastBus.arrivalTime}
              minutesUntil={null}
              rideMinutes={calcRideMinutes(lastBus.departureSeconds, lastBus.arrivalSeconds)}
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

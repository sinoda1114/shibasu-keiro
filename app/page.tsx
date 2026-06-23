'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
  Stack,
  Title,
  Text,
  Autocomplete,
  SegmentedControl,
  Radio,
  Group,
  Button,
  ActionIcon,
  Card,
  Divider,
  Box,
  Loader,
  Input,
  rem,
} from '@mantine/core'
import { IconArrowsUpDown, IconSearch, IconClock } from '@tabler/icons-react'
import { saveSearchHistory, getSearchHistory, type SearchHistoryItem } from '@/lib/search-history/local-storage'
import { LAST_FROM_STOP_KEY } from '@/lib/storage-keys'

type DayType = 'weekday' | 'saturday' | 'holiday'
type TimeMode = 'now' | 'specify'

function getTodayDayType(): DayType {
  const day = new Date().getDay()
  if (day === 0) return 'holiday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

function getNowTime(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

async function fetchStopSuggestions(query: string): Promise<string[]> {
  if (query.length === 0) return []
  const res = await fetch(
    `/api/stops/search?q=${encodeURIComponent(query)}&provider=nagoya_city_bus`
  )
  if (!res.ok) return []
  const json = await res.json()
  if (!json.success) return []
  return (json.data as { stopName: string }[]).map((s) => s.stopName)
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [fromStop, setFromStop] = useState(() => searchParams.get('from') ?? '')
  const [toStop, setToStop] = useState(() => searchParams.get('to') ?? '')
  const [fromData, setFromData] = useState<string[]>([])
  const [toData, setToData] = useState<string[]>([])
  const [fromLoading, setFromLoading] = useState(false)
  const [toLoading, setToLoading] = useState(false)
  const [dayTypeAuto, setDayTypeAuto] = useState(true)
  const [dayType, setDayType] = useState<DayType>(getTodayDayType())
  const [timeMode, setTimeMode] = useState<TimeMode>('now')
  const [specifiedTime, setSpecifiedTime] = useState(getNowTime())

  const [history, setHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory())

  const fromDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFromChange = (value: string) => {
    setFromStop(value)
    if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current)
    if (value.length === 0) {
      setFromData([])
      return
    }
    setFromLoading(true)
    fromDebounceRef.current = setTimeout(async () => {
      const suggestions = await fetchStopSuggestions(value)
      setFromData(suggestions)
      setFromLoading(false)
    }, 300)
  }

  const handleToChange = (value: string) => {
    setToStop(value)
    if (toDebounceRef.current) clearTimeout(toDebounceRef.current)
    if (value.length === 0) {
      setToData([])
      return
    }
    setToLoading(true)
    toDebounceRef.current = setTimeout(async () => {
      const suggestions = await fetchStopSuggestions(value)
      setToData(suggestions)
      setToLoading(false)
    }, 300)
  }

  const handleSwap = () => {
    setFromStop(toStop)
    setToStop(fromStop)
    setFromData(toData)
    setToData(fromData)
  }

  const handleSearch = () => {
    if (!fromStop || !toStop) return
    const resolvedDayType = dayTypeAuto ? getTodayDayType() : dayType
    const resolvedTime = timeMode === 'now' ? getNowTime() : specifiedTime
    const params = new URLSearchParams({
      from: fromStop,
      to: toStop,
      dayType: resolvedDayType,
      time: resolvedTime,
      timeMode,
    })
    saveSearchHistory(fromStop, toStop)
    setHistory(getSearchHistory())
    localStorage.setItem(LAST_FROM_STOP_KEY, fromStop)
    router.push(`/search?${params.toString()}`)
  }

  const isSearchDisabled = !fromStop.trim() || !toStop.trim()

  return (
    <Container size="sm" py="md" px="md">
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={1} size="h3" fw={800}>
            市バスかんたん時刻表
          </Title>
          <Text c="dimmed" size="sm">
            名古屋市バス 直通ルート検索
          </Text>
        </Stack>

        <Card shadow="sm" radius="lg" withBorder p="md">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch() }}>
            <Stack gap="md">
              {/* 出発・到着バス停 */}
              <Stack gap="xs">
                <Autocomplete
                  label="出発バス停"
                  placeholder="例: 栄"
                  name="from"
                  autoComplete="on"
                  data={fromData}
                  value={fromStop}
                  onChange={handleFromChange}
                  maxDropdownHeight={200}
                  radius="md"
                  size="md"
                  comboboxProps={{ shadow: 'md' }}
                  rightSection={fromLoading ? <Loader size="xs" /> : undefined}
                />

                {/* 入れ替えボタン */}
                <Box style={{ display: 'flex', justifyContent: 'center' }}>
                  <ActionIcon
                    variant="filled"
                    color="blue"
                    size="xl"
                    radius="xl"
                    type="button"
                    onClick={handleSwap}
                    aria-label="出発と到着を入れ替え"
                    style={{
                      width: rem(48),
                      height: rem(48),
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <IconArrowsUpDown size={rem(22)} stroke={2} />
                  </ActionIcon>
                </Box>

                <Autocomplete
                  label="到着バス停"
                  placeholder="例: 上浜町"
                  name="to"
                  autoComplete="on"
                  data={toData}
                  value={toStop}
                  onChange={handleToChange}
                  maxDropdownHeight={200}
                  radius="md"
                  size="md"
                  comboboxProps={{ shadow: 'md' }}
                  rightSection={toLoading ? <Loader size="xs" /> : undefined}
                />
              </Stack>

              <Divider />

              {/* ダイヤ区分 */}
              <Stack gap="xs">
                <Text size="sm" fw={600} c="gray.7">
                  ダイヤ区分
                </Text>
                <Radio
                  label="自動（今日の曜日）"
                  checked={dayTypeAuto}
                  onChange={() => setDayTypeAuto(true)}
                  size="sm"
                />
                <Radio
                  label="手動で選択"
                  checked={!dayTypeAuto}
                  onChange={() => setDayTypeAuto(false)}
                  size="sm"
                />
                {!dayTypeAuto && (
                  <SegmentedControl
                    value={dayType}
                    onChange={(v) => setDayType(v as DayType)}
                    data={[
                      { label: '平日', value: 'weekday' },
                      { label: '土曜', value: 'saturday' },
                      { label: '休日', value: 'holiday' },
                    ]}
                    radius="md"
                    fullWidth
                  />
                )}
              </Stack>

              <Divider />

              {/* 時刻選択 */}
              <Stack gap="xs">
                <Text size="sm" fw={600} c="gray.7">
                  出発時刻
                </Text>
                <Group gap="md">
                  <Radio
                    label="いま出る"
                    checked={timeMode === 'now'}
                    onChange={() => setTimeMode('now')}
                    size="sm"
                  />
                  <Radio
                    label="時刻を指定"
                    checked={timeMode === 'specify'}
                    onChange={() => setTimeMode('specify')}
                    size="sm"
                  />
                </Group>
                {timeMode === 'specify' && (
                  <Input
                    component="input"
                    type="time"
                    value={specifiedTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSpecifiedTime(e.currentTarget.value)
                    }
                    leftSection={<IconClock size={rem(16)} stroke={1.5} />}
                    radius="md"
                    size="md"
                  />
                )}
              </Stack>

              {/* 検索ボタン */}
              <Button
                fullWidth
                size="lg"
                radius="md"
                type="submit"
                leftSection={<IconSearch size={rem(20)} stroke={2} />}
                disabled={isSearchDisabled}
                style={{ marginTop: rem(4) }}
              >
                バスを検索
              </Button>
            </Stack>
          </form>
        </Card>

        {history.length > 0 && (
          <Stack gap="xs">
            <Text size="xs" c="dimmed">最近の検索</Text>
            <Stack gap={4}>
              {history.slice(0, 5).map((item, i) => (
                <Button
                  key={i}
                  variant="subtle"
                  size="xs"
                  justify="start"
                  onClick={() => {
                    setFromStop(item.from)
                    setToStop(item.to)
                  }}
                >
                  {item.from} → {item.to}
                </Button>
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Container size="sm" py="md" px="md">
          <Text c="dimmed">読み込み中...</Text>
        </Container>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}

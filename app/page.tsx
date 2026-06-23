'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
  Stack,
  Title,
  Text,
  Autocomplete,
  SegmentedControl,
  Group,
  Button,
  ActionIcon,
  Card,
  Divider,
  Box,
  Loader,
  Input,
  Popover,
  rem,
} from '@mantine/core'
import { IconArrowsUpDown, IconSearch, IconClock, IconX, IconStar } from '@tabler/icons-react'
import { saveSearchHistory, getSearchHistory, type SearchHistoryItem } from '@/lib/search-history/local-storage'
import { getStopFavorites, toggleStopFavorite } from '@/lib/stop-favorites/local-storage'
import { LAST_FROM_STOP_KEY } from '@/lib/storage-keys'

type DayType = 'auto' | 'weekday' | 'saturday' | 'holiday'
type TimeMode = 'depart' | 'arrive'

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

const ITEM_H = 44
const VISIBLE = 5
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PAD = Math.floor(VISIBLE / 2) // = 2

function WheelColumn({
  items,
  selected,
  onSelect,
  label,
}: {
  items: number[]
  selected: number
  onSelect: (v: number) => void
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const programmatic = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = items.indexOf(selected)
    if (idx < 0) return
    programmatic.current = true
    el.scrollTop = idx * ITEM_H
    const t = setTimeout(() => { programmatic.current = false }, 200)
    return () => clearTimeout(t)
  }, [selected, items])

  const handleScroll = () => {
    if (programmatic.current || !ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const v = items[Math.max(0, Math.min(items.length - 1, idx))]
    if (v !== selected) onSelect(v)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <Text size="xs" c="dimmed" fw={600}>{label}</Text>
      <div style={{ position: 'relative', width: 64 }}>
        {/* 選択ハイライト */}
        <div style={{
          position: 'absolute',
          top: ITEM_H * PAD,
          left: 4,
          right: 4,
          height: ITEM_H,
          background: 'var(--mantine-color-blue-0)',
          borderRadius: 8,
          border: '2px solid var(--mantine-color-blue-3)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
        {/* 上フェード */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: ITEM_H * PAD,
          background: 'linear-gradient(to bottom, white 50%, transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        {/* 下フェード */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: ITEM_H * PAD,
          background: 'linear-gradient(to top, white 50%, transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        <div
          ref={ref}
          className="shibasu-wheel"
          onScroll={handleScroll}
          style={{
            height: ITEM_H * VISIBLE,
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          <div style={{ height: ITEM_H * PAD }} />
          {items.map((v) => (
            <div
              key={v}
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: v === selected ? 22 : 17,
                fontWeight: v === selected ? 700 : 400,
                color: v === selected
                  ? 'var(--mantine-color-blue-7)'
                  : 'var(--mantine-color-gray-5)',
                transition: 'font-size 0.12s, color 0.12s',
                cursor: 'pointer',
                userSelect: 'none',
                position: 'relative',
                zIndex: 3,
              }}
              onClick={() => {
                onSelect(v)
                ref.current?.scrollTo({ top: items.indexOf(v) * ITEM_H, behavior: 'smooth' })
              }}
            >
              {String(v).padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: ITEM_H * PAD }} />
        </div>
      </div>
    </div>
  )
}

function TimePickerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [opened, setOpened] = useState(false)
  const [hour, minute] = value.split(':').map((n) => parseInt(n, 10))

  const setHour = (h: number) =>
    onChange(`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  const setMinute = (m: number) =>
    onChange(`${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`)

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" trapFocus={false}>
      <Popover.Target>
        <Input
          component="button"
          type="button"
          pointer
          onClick={() => setOpened((o) => !o)}
          leftSection={<IconClock size={rem(16)} stroke={1.5} />}
          radius="md"
          size="md"
          styles={{ input: { textAlign: 'left', cursor: 'pointer' } }}
        >
          {value}
        </Input>
      </Popover.Target>
      <Popover.Dropdown p="md">
        {/* webkit用スクロールバー非表示 */}
        <style>{`.shibasu-wheel::-webkit-scrollbar{display:none}`}</style>
        <Group gap="sm" align="flex-start" wrap="nowrap" justify="center">
          <WheelColumn items={HOURS} selected={hour} onSelect={setHour} label="時" />
          <Text
            size="xl"
            fw={700}
            style={{ paddingTop: rem(ITEM_H * PAD + 10), color: 'var(--mantine-color-gray-6)' }}
          >
            :
          </Text>
          <WheelColumn items={MINUTES} selected={minute} onSelect={setMinute} label="分" />
        </Group>
        <Button fullWidth size="sm" mt="xs" onClick={() => setOpened(false)}>
          OK
        </Button>
      </Popover.Dropdown>
    </Popover>
  )
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
  const [dayType, setDayType] = useState<DayType>(() => (searchParams.get('dayType') as DayType) ?? 'auto')
  const [timeMode, setTimeMode] = useState<TimeMode>(() => (searchParams.get('timeMode') as TimeMode) ?? 'depart')
  const [specifiedTime, setSpecifiedTime] = useState(() => searchParams.get('time') ?? getNowTime())

  const [history, setHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory())
  const [stopFavorites, setStopFavorites] = useState<string[]>(() => getStopFavorites())

  const fromDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getQuickAccessStops = (): string[] => {
    const favs = getStopFavorites()
    const seen = new Set(favs)
    const recentStops: string[] = []
    for (const h of history) {
      for (const s of [h.from, h.to]) {
        if (!seen.has(s)) {
          seen.add(s)
          recentStops.push(s)
        }
      }
    }
    return [...favs, ...recentStops]
  }

  const handleFromChange = (value: string) => {
    setFromStop(value)
    if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current)
    if (value.length === 0) {
      setFromData(getQuickAccessStops())
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
      setToData(getQuickAccessStops())
      return
    }
    setToLoading(true)
    toDebounceRef.current = setTimeout(async () => {
      const suggestions = await fetchStopSuggestions(value)
      setToData(suggestions)
      setToLoading(false)
    }, 300)
  }

  const handleFromFocus = () => {
    if (fromStop.length === 0) setFromData(getQuickAccessStops())
  }

  const handleToFocus = () => {
    if (toStop.length === 0) setToData(getQuickAccessStops())
  }

  const handleStarToggle = (stopName: string) => {
    toggleStopFavorite(stopName)
    setStopFavorites(getStopFavorites())
  }

  const renderStopOption = ({ option }: { option: string | { value: string; label?: string } }) => {
    const stopName = typeof option === 'string' ? option : option.value
    const isFav = stopFavorites.includes(stopName)
    return (
      <Group justify="space-between" style={{ width: '100%' }} wrap="nowrap">
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stopName}
        </span>
        <ActionIcon
          variant="transparent"
          color={isFav ? 'yellow' : 'gray'}
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleStarToggle(stopName)
          }}
          aria-label={isFav ? 'お気に入りから削除' : 'お気に入りに追加'}
        >
          <IconStar size={14} fill={isFav ? 'currentColor' : 'none'} />
        </ActionIcon>
      </Group>
    )
  }

  const handleSwap = () => {
    setFromStop(toStop)
    setToStop(fromStop)
    setFromData(toData)
    setToData(fromData)
  }

  const handleSearch = () => {
    if (!fromStop || !toStop) return
    const resolvedDayType = dayType === 'auto' ? getTodayDayType() : dayType
    const resolvedTime = specifiedTime
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
            市バスかんたん検索
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
                  autoComplete="off"
                  data={fromData}
                  value={fromStop}
                  onChange={handleFromChange}
                  onFocus={handleFromFocus}
                  maxDropdownHeight={240}
                  radius="md"
                  size="md"
                  comboboxProps={{ shadow: 'md' }}
                  renderOption={renderStopOption}
                  rightSection={
                    fromLoading ? (
                      <Loader size="xs" />
                    ) : fromStop ? (
                      <ActionIcon
                        variant="transparent"
                        color="gray"
                        size="sm"
                        onClick={() => { setFromStop(''); setFromData(getQuickAccessStops()) }}
                        aria-label="クリア"
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    ) : undefined
                  }
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
                  placeholder="例: 金山"
                  name="to"
                  autoComplete="off"
                  data={toData}
                  value={toStop}
                  onChange={handleToChange}
                  onFocus={handleToFocus}
                  maxDropdownHeight={240}
                  radius="md"
                  size="md"
                  comboboxProps={{ shadow: 'md' }}
                  renderOption={renderStopOption}
                  rightSection={
                    toLoading ? (
                      <Loader size="xs" />
                    ) : toStop ? (
                      <ActionIcon
                        variant="transparent"
                        color="gray"
                        size="sm"
                        onClick={() => { setToStop(''); setToData(getQuickAccessStops()) }}
                        aria-label="クリア"
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    ) : undefined
                  }
                />
              </Stack>

              <Divider />

              {/* ダイヤ区分 */}
              <Stack gap="xs">
                <Text size="sm" fw={600} c="gray.7">
                  ダイヤ区分
                </Text>
                <SegmentedControl
                  value={dayType}
                  onChange={(v) => setDayType(v as DayType)}
                  data={[
                    { label: '自動', value: 'auto' },
                    { label: '平日', value: 'weekday' },
                    { label: '土曜', value: 'saturday' },
                    { label: '休日', value: 'holiday' },
                  ]}
                  radius="md"
                  fullWidth
                />
              </Stack>

              <Divider />

              {/* 時刻選択 */}
              <Stack gap="xs">
                <Text size="sm" fw={600} c="gray.7">
                  時刻
                </Text>
                <SegmentedControl
                  value={timeMode}
                  onChange={(v) => setTimeMode(v as TimeMode)}
                  data={[
                    { label: '出発時刻', value: 'depart' },
                    { label: '到着時刻', value: 'arrive' },
                  ]}
                  radius="md"
                  fullWidth
                />
                <TimePickerInput value={specifiedTime} onChange={setSpecifiedTime} />
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

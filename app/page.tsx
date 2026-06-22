'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  rem,
} from '@mantine/core'
import { TimeInput } from '@mantine/dates'
import { IconArrowsUpDown, IconSearch, IconClock } from '@tabler/icons-react'

const MOCK_STOPS = [
  '栄',
  '上浜町',
  '名古屋駅',
  '大曽根',
  '金山',
  '熱田神宮前',
  '吹上',
  '御器所',
  '八事日赤',
  '星ヶ丘',
]

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

export default function SearchPage() {
  const router = useRouter()

  const [fromStop, setFromStop] = useState('')
  const [toStop, setToStop] = useState('')
  const [dayTypeAuto, setDayTypeAuto] = useState(true)
  const [dayType, setDayType] = useState<DayType>(getTodayDayType())
  const [timeMode, setTimeMode] = useState<TimeMode>('now')
  const [specifiedTime, setSpecifiedTime] = useState(getNowTime())

  const handleSwap = () => {
    setFromStop(toStop)
    setToStop(fromStop)
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
    })
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
          <Stack gap="md">
            {/* 出発・到着バス停 */}
            <Stack gap="xs">
              <Autocomplete
                label="出発バス停"
                placeholder="例: 栄"
                data={MOCK_STOPS}
                value={fromStop}
                onChange={setFromStop}
                maxDropdownHeight={200}
                radius="md"
                size="md"
                comboboxProps={{ shadow: 'md' }}
              />

              {/* 入れ替えボタン */}
              <Box style={{ display: 'flex', justifyContent: 'center' }}>
                <ActionIcon
                  variant="filled"
                  color="blue"
                  size="xl"
                  radius="xl"
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
                data={MOCK_STOPS}
                value={toStop}
                onChange={setToStop}
                maxDropdownHeight={200}
                radius="md"
                size="md"
                comboboxProps={{ shadow: 'md' }}
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
                <TimeInput
                  value={specifiedTime}
                  onChange={(e) => setSpecifiedTime(e.currentTarget.value)}
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
              leftSection={<IconSearch size={rem(20)} stroke={2} />}
              onClick={handleSearch}
              disabled={isSearchDisabled}
              style={{ marginTop: rem(4) }}
            >
              バスを検索
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}

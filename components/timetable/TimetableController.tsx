'use client'

import { useEffect, useState } from 'react'
import { Stack, Title, SegmentedControl, Select, Text, Loader, Center, Alert } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { TimetableView, type TimetableEntry } from './TimetableView'
import type { DayType, TimetableDirection } from '@/app/api/timetable/route'

const DAY_TYPE_OPTIONS = [
  { label: '平日', value: 'weekday' },
  { label: '土曜', value: 'saturday' },
  { label: '休日', value: 'holiday' },
]

interface TimetableControllerProps {
  stopName: string
}

export function TimetableController({ stopName }: TimetableControllerProps) {
  const [dayType, setDayType] = useState<DayType>('weekday')
  const [directionIndex, setDirectionIndex] = useState('0')
  const [directions, setDirections] = useState<TimetableDirection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setDirectionIndex('0')

    const params = new URLSearchParams({ stopName, dayType })
    fetch(`/api/timetable?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error ?? 'データ取得に失敗しました')
        setDirections(json.data)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'エラーが発生しました'))
      .finally(() => setLoading(false))
  }, [stopName, dayType])

  const selectedDirection = directions[Number(directionIndex)] ?? directions[0]
  const directionOptions = directions.map((d, i) => ({ label: d.headsign, value: String(i) }))
  const entries: TimetableEntry[] = selectedDirection?.entries ?? []

  return (
    <Stack gap="md">
      <Title order={2} size="h3">
        {stopName}
      </Title>

      <SegmentedControl
        fullWidth
        data={DAY_TYPE_OPTIONS}
        value={dayType}
        onChange={(v) => setDayType(v as DayType)}
      />

      {loading && (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      )}

      {!loading && error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="エラー">
          {error}
        </Alert>
      )}

      {!loading && !error && directions.length === 0 && (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          この区分の時刻データがありません
        </Text>
      )}

      {!loading && !error && directions.length > 0 && (
        <>
          {directionOptions.length > 1 && (
            <Select
              label="方面"
              data={directionOptions}
              value={directionIndex}
              onChange={(v) => setDirectionIndex(v ?? '0')}
              allowDeselect={false}
            />
          )}
          <TimetableView entries={entries} lastDeparture={selectedDirection?.lastDeparture} />
        </>
      )}
    </Stack>
  )
}

'use client'

import { useEffect, useReducer, useState } from 'react'
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

type FetchState = {
  loading: boolean
  error: string | null
  directions: TimetableDirection[]
  directionIndex: string
}

type FetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; directions: TimetableDirection[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SET_DIRECTION'; index: string }

const initialFetchState: FetchState = {
  loading: true,
  error: null,
  directions: [],
  directionIndex: '0',
}

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START':
      return initialFetchState
    case 'FETCH_SUCCESS':
      return { loading: false, error: null, directions: action.directions, directionIndex: '0' }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.message }
    case 'SET_DIRECTION':
      return { ...state, directionIndex: action.index }
  }
}

export function TimetableController({ stopName }: TimetableControllerProps) {
  const [dayType, setDayType] = useState<DayType>('weekday')
  const [{ loading, error, directions, directionIndex }, dispatch] = useReducer(
    fetchReducer,
    initialFetchState,
  )

  useEffect(() => {
    dispatch({ type: 'FETCH_START' })

    const params = new URLSearchParams({ stopName, dayType })
    fetch(`/api/timetable?${params}`)
      .then((r) => r.json())
      .then((json: { success: boolean; error?: string; data: TimetableDirection[] }) => {
        if (!json.success) throw new Error(json.error ?? 'データ取得に失敗しました')
        dispatch({ type: 'FETCH_SUCCESS', directions: json.data })
      })
      .catch((e: unknown) =>
        dispatch({
          type: 'FETCH_ERROR',
          message: e instanceof Error ? e.message : 'エラーが発生しました',
        }),
      )
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
              onChange={(v) => dispatch({ type: 'SET_DIRECTION', index: v ?? '0' })}
              allowDeselect={false}
            />
          )}
          <TimetableView entries={entries} lastDeparture={selectedDirection?.lastDeparture} />
        </>
      )}
    </Stack>
  )
}

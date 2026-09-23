'use client'

import { useEffect, useReducer, useState } from 'react'
import { Stack, Title, SegmentedControl, Select, Text, Loader, Center, Alert } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { TimetableView, type TimetableEntry } from './TimetableView'
import type { TimetableDirection } from '@/app/api/timetable/route'
import { useIsHydrated } from '@/lib/use-is-hydrated'
import {
  formatJstYYYYMMDD,
  formatServiceDateLabel,
  getJstDayType,
  getJstTime,
  getServiceDate,
  msUntilNextJstDate,
  type DayType,
} from '@/lib/jst'

const DAY_TYPE_OPTIONS = [
  { label: '平日', value: 'weekday' },
  { label: <Text size="sm" fw={600} c="blue.7" component="span">土曜</Text>, value: 'saturday' },
  { label: <Text size="sm" fw={600} c="red.7" component="span">休日</Text>, value: 'holiday' },
]

interface TimetableControllerProps {
  stopName: string
  provider: string
  initialHeadsign?: string
}

type FetchState = {
  // API に渡した日付（YYYYMMDD）。表示もこの値から出し、引いた日付と食い違わないようにする
  date: string | null
  loading: boolean
  error: string | null
  directions: TimetableDirection[]
  directionIndex: string
}

type FetchAction =
  | { type: 'FETCH_START'; date: string }
  | { type: 'FETCH_SUCCESS'; directions: TimetableDirection[]; initialHeadsign?: string }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SET_DIRECTION'; index: string }

const initialFetchState: FetchState = {
  date: null,
  loading: true,
  error: null,
  directions: [],
  directionIndex: '0',
}

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...initialFetchState, date: action.date }
    case 'FETCH_SUCCESS': {
      const matched = action.initialHeadsign
        ? action.directions.findIndex((d) => d.headsign === action.initialHeadsign)
        : -1
      return { ...state, loading: false, error: null, directions: action.directions, directionIndex: matched >= 0 ? String(matched) : '0' }
    }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.message }
    case 'SET_DIRECTION':
      return { ...state, directionIndex: action.index }
  }
}

function readClock(now: Date): { today: string; dayType: DayType; time: { hour: number; minute: number } } {
  return { today: formatJstYYYYMMDD(now), dayType: getJstDayType(now), time: getJstTime(now) }
}

export function TimetableController({ stopName, provider, initialHeadsign }: TimetableControllerProps) {
  const isHydrated = useIsHydrated()
  // 今日（JST）と、今日の曜日区分・現在時刻。日付をまたいだら 3 つをまとめて更新する。
  // today は描画には使わず、日付が変わったら下の取得をやり直すきっかけにする
  const [clock, setClock] = useState(() => readClock(new Date()))
  // 利用者が選んだ区分。選んでいなければ今日の区分に従い、日付をまたいだら選び直す
  const [chosenDayType, setChosenDayType] = useState<DayType | null>(null)
  const dayType = chosenDayType ?? clock.dayType
  const currentTime = clock.time
  const [{ date, loading, error, directions, directionIndex }, dispatch] = useReducer(
    fetchReducer,
    initialFetchState,
  )

  // ページを開いたまま日付をまたいだら、今日を更新して翌日の日付で引き直す。
  // 0 時のタイマーに加え、バックグラウンドでタイマーが止まる端末のためにタブが再び表示されたときも確かめる。
  // 同じ日付なら state を変えないので、二重に取得しない
  useEffect(() => {
    const sync = () => {
      const now = new Date()
      setClock((prev) => (prev.today === formatJstYYYYMMDD(now) ? prev : readClock(now)))
    }
    // 0 時の直前に発火して日付が変わっていなくても、残りの時間で張り直す
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        sync()
        schedule()
      }, msUntilNextJstDate())
    }
    schedule()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // 検索と同じく、選んだ曜日区分を日付に直して渡す（API は日付で運行日を引き、祝日・年末年始の例外を反映する）。
    // 今日の日付はサーバーとブラウザで食い違いうるので、描画中ではなくここで決める
    const serviceDate = getServiceDate(dayType)
    dispatch({ type: 'FETCH_START', date: serviceDate })

    // 区分を切り替えたら前の要求は中断し、遅れて届いた応答で今の日付の表示を上書きしない
    const controller = new AbortController()
    const params = new URLSearchParams({ stopName, date: serviceDate, provider })
    fetch(`/api/timetable?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json: { success: boolean; error?: string; data: TimetableDirection[] }) => {
        if (controller.signal.aborted) return
        if (!json.success) throw new Error(json.error ?? 'データ取得に失敗しました')
        dispatch({ type: 'FETCH_SUCCESS', directions: json.data, initialHeadsign })
      })
      .catch((e: unknown) => {
        // 中断による AbortError はエラーとして出さない
        if (controller.signal.aborted) return
        dispatch({
          type: 'FETCH_ERROR',
          message: e instanceof Error ? e.message : 'エラーが発生しました',
        })
      })
    return () => controller.abort()
    // clock.today は日付をまたいだら getServiceDate を計算し直すためだけに依存に入れる
  }, [stopName, dayType, provider, clock.today])

  const selectedDirection = directions[Number(directionIndex)] ?? directions[0]
  const directionOptions = directions.map((d, i) => ({ label: d.headsign, value: String(i) }))
  const entries: TimetableEntry[] = selectedDirection?.entries ?? []
  const dateLabel = date ? formatServiceDateLabel(date) : null

  return (
    <Stack gap="md">
      <Title order={2} size="h3">
        {stopName}
      </Title>

      <SegmentedControl
        fullWidth
        data={DAY_TYPE_OPTIONS}
        // 今日の曜日区分はサーバーとブラウザで食い違いうるので、ハイドレーション後に選択を出す
        value={isHydrated ? dayType : ''}
        onChange={(v) => setChosenDayType(v as DayType)}
      />

      {dateLabel && (
        <Text size="sm" c="dimmed" ta="center">
          {dateLabel}の運行
        </Text>
      )}

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
          {dateLabel ? `${dateLabel}は運行がありません` : 'この日は運行がありません'}
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
          <TimetableView
            entries={entries}
            lastDeparture={selectedDirection?.lastDeparture}
            currentTime={date === clock.today ? currentTime : undefined}
          />
        </>
      )}
    </Stack>
  )
}

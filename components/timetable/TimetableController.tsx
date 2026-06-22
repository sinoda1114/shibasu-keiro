'use client'

import { useState } from 'react'
import {
  Stack,
  Title,
  SegmentedControl,
  Select,
  Text,
} from '@mantine/core'
import { TimetableView, type TimetableEntry } from './TimetableView'

type DayType = 'weekday' | 'saturday' | 'holiday'

interface DirectionTimetable {
  label: string
  entries: TimetableEntry[]
  lastDeparture: { hour: number; minute: number }
}

interface MockTimetableData {
  stopName: string
  directions: DirectionTimetable[]
}

const MOCK_DATA: Record<DayType, MockTimetableData> = {
  weekday: {
    stopName: '栄',
    directions: [
      {
        label: '名古屋駅方面',
        lastDeparture: { hour: 23, minute: 10 },
        entries: [
          { hour: 6, minutes: [5, 20, 38, 55] },
          { hour: 7, minutes: [8, 18, 28, 38, 48, 58] },
          { hour: 8, minutes: [8, 18, 30, 45] },
          { hour: 9, minutes: [0, 15, 30, 50] },
          { hour: 10, minutes: [10, 30, 50] },
          { hour: 11, minutes: [10, 30, 50] },
          { hour: 12, minutes: [10, 30, 50] },
          { hour: 13, minutes: [10, 30, 50] },
          { hour: 14, minutes: [10, 30, 50] },
          { hour: 15, minutes: [5, 20, 38, 55] },
          { hour: 16, minutes: [8, 22, 36, 50] },
          { hour: 17, minutes: [4, 18, 32, 46] },
          { hour: 18, minutes: [12, 27, 45] },
          { hour: 19, minutes: [5, 18, 39, 57] },
          { hour: 20, minutes: [10, 31, 52] },
          { hour: 21, minutes: [15, 40] },
          { hour: 22, minutes: [10, 40] },
          { hour: 23, minutes: [10] },
        ],
      },
      {
        label: '金山方面',
        lastDeparture: { hour: 22, minute: 50 },
        entries: [
          { hour: 6, minutes: [12, 30, 48] },
          { hour: 7, minutes: [6, 18, 30, 42, 54] },
          { hour: 8, minutes: [6, 20, 35, 52] },
          { hour: 9, minutes: [10, 25, 45] },
          { hour: 10, minutes: [5, 25, 50] },
          { hour: 11, minutes: [15, 40] },
          { hour: 12, minutes: [5, 30, 55] },
          { hour: 13, minutes: [20, 45] },
          { hour: 14, minutes: [10, 35] },
          { hour: 15, minutes: [0, 20, 40] },
          { hour: 16, minutes: [5, 25, 45] },
          { hour: 17, minutes: [10, 30, 50] },
          { hour: 18, minutes: [15, 38] },
          { hour: 19, minutes: [2, 28, 55] },
          { hour: 20, minutes: [25, 52] },
          { hour: 21, minutes: [20, 50] },
          { hour: 22, minutes: [20, 50] },
        ],
      },
    ],
  },
  saturday: {
    stopName: '栄',
    directions: [
      {
        label: '名古屋駅方面',
        lastDeparture: { hour: 22, minute: 45 },
        entries: [
          { hour: 7, minutes: [10, 30, 55] },
          { hour: 8, minutes: [20, 45] },
          { hour: 9, minutes: [10, 30, 50] },
          { hour: 10, minutes: [10, 30, 50] },
          { hour: 11, minutes: [10, 35] },
          { hour: 12, minutes: [5, 30, 55] },
          { hour: 13, minutes: [20, 50] },
          { hour: 14, minutes: [20, 50] },
          { hour: 15, minutes: [20, 50] },
          { hour: 16, minutes: [15, 45] },
          { hour: 17, minutes: [15, 45] },
          { hour: 18, minutes: [20, 50] },
          { hour: 19, minutes: [25, 55] },
          { hour: 20, minutes: [30] },
          { hour: 21, minutes: [10, 45] },
          { hour: 22, minutes: [45] },
        ],
      },
      {
        label: '金山方面',
        lastDeparture: { hour: 22, minute: 30 },
        entries: [
          { hour: 7, minutes: [20, 48] },
          { hour: 8, minutes: [15, 45] },
          { hour: 9, minutes: [15, 45] },
          { hour: 10, minutes: [15, 45] },
          { hour: 11, minutes: [15, 45] },
          { hour: 12, minutes: [15, 45] },
          { hour: 13, minutes: [15, 48] },
          { hour: 14, minutes: [18, 48] },
          { hour: 15, minutes: [18, 48] },
          { hour: 16, minutes: [18, 48] },
          { hour: 17, minutes: [18, 48] },
          { hour: 18, minutes: [20, 52] },
          { hour: 19, minutes: [28] },
          { hour: 20, minutes: [5, 38] },
          { hour: 21, minutes: [15, 50] },
          { hour: 22, minutes: [30] },
        ],
      },
    ],
  },
  holiday: {
    stopName: '栄',
    directions: [
      {
        label: '名古屋駅方面',
        lastDeparture: { hour: 22, minute: 30 },
        entries: [
          { hour: 8, minutes: [0, 30] },
          { hour: 9, minutes: [0, 30] },
          { hour: 10, minutes: [0, 30] },
          { hour: 11, minutes: [0, 30] },
          { hour: 12, minutes: [0, 30] },
          { hour: 13, minutes: [0, 30] },
          { hour: 14, minutes: [0, 30] },
          { hour: 15, minutes: [0, 30] },
          { hour: 16, minutes: [0, 30] },
          { hour: 17, minutes: [0, 30] },
          { hour: 18, minutes: [0, 30] },
          { hour: 19, minutes: [0, 30] },
          { hour: 20, minutes: [15, 45] },
          { hour: 21, minutes: [20, 50] },
          { hour: 22, minutes: [30] },
        ],
      },
      {
        label: '金山方面',
        lastDeparture: { hour: 22, minute: 0 },
        entries: [
          { hour: 8, minutes: [15, 45] },
          { hour: 9, minutes: [15, 45] },
          { hour: 10, minutes: [15, 45] },
          { hour: 11, minutes: [15, 45] },
          { hour: 12, minutes: [15, 45] },
          { hour: 13, minutes: [15, 45] },
          { hour: 14, minutes: [15, 45] },
          { hour: 15, minutes: [15, 45] },
          { hour: 16, minutes: [15, 45] },
          { hour: 17, minutes: [15, 45] },
          { hour: 18, minutes: [15, 45] },
          { hour: 19, minutes: [15, 45] },
          { hour: 20, minutes: [30] },
          { hour: 21, minutes: [10, 40] },
          { hour: 22, minutes: [0] },
        ],
      },
    ],
  },
}

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

  const data = MOCK_DATA[dayType]
  const directions = data.directions
  const selectedDirection = directions[Number(directionIndex)] ?? directions[0]

  const directionOptions = directions.map((d, i) => ({
    label: d.label,
    value: String(i),
  }))

  return (
    <Stack gap="md">
      {/* バス停名 */}
      <Title order={2} size="h3">
        {stopName}
      </Title>
      <Text c="dimmed" size="xs">
        ※ 表示データはモックです
      </Text>

      {/* ダイヤ区分 */}
      <SegmentedControl
        fullWidth
        data={DAY_TYPE_OPTIONS}
        value={dayType}
        onChange={(v) => {
          setDayType(v as DayType)
          setDirectionIndex('0')
        }}
      />

      {/* 方面選択 */}
      <Select
        label="方面"
        data={directionOptions}
        value={directionIndex}
        onChange={(v) => setDirectionIndex(v ?? '0')}
        allowDeselect={false}
      />

      {/* 時刻表 */}
      <TimetableView
        entries={selectedDirection.entries}
        lastDeparture={selectedDirection.lastDeparture}
      />
    </Stack>
  )
}

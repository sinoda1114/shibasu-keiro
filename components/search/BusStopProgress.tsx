'use client'

import { useState, useEffect, useRef } from 'react'
import { Text, Loader, Center, rem } from '@mantine/core'
import type { TripStop } from '@/app/api/routes/trip-stops/route'

function getNowSeconds(): number {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.getUTCHours() * 3600 + jst.getUTCMinutes() * 60 + jst.getUTCSeconds()
}

function getCurrentStopIndex(stops: TripStop[], nowSec: number): number {
  let idx = -1
  for (let i = 0; i < stops.length; i++) {
    const dep = stops[i].departureTimeSeconds
    if (dep != null && dep <= nowSec) idx = i
  }
  return idx
}

type BusStatus = 'before' | 'active' | 'after'

function getBusStatus(stops: TripStop[], nowSec: number): BusStatus {
  if (stops.length === 0) return 'before'
  const first = stops[0].departureTimeSeconds
  const last = stops[stops.length - 1].arrivalTimeSeconds
  if (first != null && nowSec < first) return 'before'
  if (last != null && nowSec > last) return 'after'
  return 'active'
}

interface Props {
  tripId: string
  fromStopName: string
  toStopName: string
  date: string
}

export function BusStopProgress({ tripId, fromStopName, toStopName, date }: Props) {
  const [stopsData, setStopsData] = useState<{ key: string; stops: TripStop[] } | null>(null)
  const [nowSec, setNowSec] = useState(getNowSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentKey = `${tripId}|${fromStopName}|${toStopName}|${date}`
  const loading = stopsData === null || stopsData.key !== currentKey
  const stops = loading ? [] : stopsData.stops

  useEffect(() => {
    const key = `${tripId}|${fromStopName}|${toStopName}|${date}`
    fetch(
      `/api/routes/trip-stops?tripId=${encodeURIComponent(tripId)}&from=${encodeURIComponent(fromStopName)}&to=${encodeURIComponent(toStopName)}&date=${date}`
    )
      .then((r) => r.json())
      .then((json: { success: boolean; data?: TripStop[] }) => {
        setStopsData({ key, stops: json.success ? (json.data ?? []) : [] })
      })
      .catch(() => setStopsData({ key, stops: [] }))
  }, [tripId, fromStopName, toStopName, date])

  useEffect(() => {
    timerRef.current = setInterval(() => setNowSec(getNowSeconds()), 30_000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <Center py="sm">
        <Loader size="xs" />
      </Center>
    )
  }

  if (stops.length === 0) {
    return <Text size="xs" c="dimmed" ta="center" py="xs">停留所情報を取得できませんでした</Text>
  }

  const status = getBusStatus(stops, nowSec)
  const currentIdx = status === 'active' ? getCurrentStopIndex(stops, nowSec) : -1

  return (
    <>
      <style>{`
        @keyframes shibasu-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          50% { opacity: 0.85; box-shadow: 0 0 0 5px rgba(59,130,246,0); }
        }
        .shibasu-bus-dot-current {
          animation: shibasu-pulse 1.4s ease-in-out infinite;
        }
      `}</style>

      {status === 'before' && (
        <Text size="xs" c="blue.6" fw={600} ta="center" mb={rem(6)}>
          まもなく出発
        </Text>
      )}
      {status === 'after' && (
        <Text size="xs" c="gray.5" ta="center" mb={rem(6)}>
          到着済み
        </Text>
      )}

      <div style={{ paddingLeft: rem(8) }}>
        {stops.map((stop, i) => {
          const isPast = status === 'active' ? i < currentIdx : status === 'after'
          const isCurrent = status === 'active' && i === currentIdx
          const isFuture = !isPast && !isCurrent
          const isFirst = i === 0
          const isLast = i === stops.length - 1
          const displayTime = isFirst
            ? stop.departureTime
            : isLast
            ? stop.arrivalTime
            : (stop.departureTime ?? stop.arrivalTime)

          return (
            <div key={stop.stopSequence} style={{ display: 'flex', alignItems: 'stretch', minHeight: rem(40) }}>
              {/* 左カラム: 縦線 + ドット */}
              <div style={{
                width: rem(24),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                {/* 上の縦線 */}
                <div style={{
                  width: 2,
                  flex: isFirst ? '0 0 50%' : 1,
                  background: isFirst ? 'transparent' : (isPast || isCurrent ? 'var(--mantine-color-blue-4)' : 'var(--mantine-color-gray-3)'),
                }} />
                {/* ドット */}
                <div
                  className={isCurrent ? 'shibasu-bus-dot-current' : undefined}
                  style={{
                    width: isCurrent ? rem(14) : rem(10),
                    height: isCurrent ? rem(14) : rem(10),
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isCurrent
                      ? 'var(--mantine-color-blue-5)'
                      : isPast
                      ? 'var(--mantine-color-blue-3)'
                      : 'var(--mantine-color-gray-1)',
                    border: isFuture
                      ? '2px solid var(--mantine-color-gray-4)'
                      : `2px solid ${isCurrent ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-blue-4)'}`,
                  }}
                />
                {/* 下の縦線 */}
                <div style={{
                  width: 2,
                  flex: isLast ? '0 0 50%' : 1,
                  background: isLast ? 'transparent' : (isPast ? 'var(--mantine-color-blue-4)' : 'var(--mantine-color-gray-3)'),
                }} />
              </div>

              {/* 右カラム: 停留所名 + 時刻 */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: rem(8),
                paddingTop: rem(2),
                paddingBottom: rem(2),
              }}>
                <Text
                  size="xs"
                  fw={isCurrent ? 700 : isFirst || isLast ? 600 : 400}
                  c={isCurrent ? 'blue.7' : isPast ? 'gray.5' : isFuture ? 'gray.7' : undefined}
                  style={{ lineHeight: 1.3 }}
                >
                  {stop.stopName}
                  {isCurrent && (
                    <Text component="span" size="xs" c="blue.5" fw={700} ml={4}>
                      ← 現在地
                    </Text>
                  )}
                </Text>
                <Text
                  size="xs"
                  c={isCurrent ? 'blue.6' : isPast ? 'gray.4' : 'gray.6'}
                  fw={isCurrent ? 700 : 400}
                  style={{ flexShrink: 0, marginLeft: rem(4) }}
                >
                  {displayTime ?? '—'}
                </Text>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

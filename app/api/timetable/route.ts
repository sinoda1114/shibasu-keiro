import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, isNotNull, or } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { busStops, busStopTimes, busTrips, gtfsCalendar } from '@/lib/db/schema'
import { getActiveVersionId } from '@/lib/gtfs/service-resolver'

export type DayType = 'weekday' | 'saturday' | 'holiday'

export interface TimetableDirection {
  headsign: string
  entries: { hour: number; minutes: number[] }[]
  lastDeparture: { hour: number; minute: number }
}

async function resolveServiceIdsByDayType(
  providerId: string,
  gtfsVersionId: string,
  dayType: DayType
): Promise<string[]> {
  const dayFilter =
    dayType === 'weekday'
      ? or(
          eq(gtfsCalendar.monday, 1),
          eq(gtfsCalendar.tuesday, 1),
          eq(gtfsCalendar.wednesday, 1),
          eq(gtfsCalendar.thursday, 1),
          eq(gtfsCalendar.friday, 1)
        )
      : dayType === 'saturday'
      ? eq(gtfsCalendar.saturday, 1)
      : eq(gtfsCalendar.sunday, 1)

  const rows = await db
    .select({ serviceId: gtfsCalendar.serviceId })
    .from(gtfsCalendar)
    .where(and(eq(gtfsCalendar.providerId, providerId), eq(gtfsCalendar.gtfsVersionId, gtfsVersionId), dayFilter))

  return [...new Set(rows.map((r) => r.serviceId))]
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const stopName = searchParams.get('stopName')?.trim()
  const dayType = (searchParams.get('dayType') ?? 'weekday') as DayType
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!stopName) {
    return NextResponse.json({ success: false, error: 'stopName は必須です' }, { status: 400 })
  }

  const versionId = await getActiveVersionId(providerId)
  if (!versionId) {
    return NextResponse.json(
      { success: false, error: 'データが利用できません。インポートをお待ちください。' },
      { status: 503 }
    )
  }

  const [stops, serviceIds] = await Promise.all([
    db
      .select({ stopId: busStops.stopId })
      .from(busStops)
      .where(and(eq(busStops.providerId, providerId), eq(busStops.gtfsVersionId, versionId), eq(busStops.stopName, stopName))),
    resolveServiceIdsByDayType(providerId, versionId, dayType),
  ])

  if (stops.length === 0) {
    return NextResponse.json({ success: false, error: 'バス停が見つかりません' }, { status: 404 })
  }
  if (serviceIds.length === 0) {
    return NextResponse.json({ success: true, data: [] })
  }

  const stopIds = stops.map((s) => s.stopId)

  const rows = await db
    .select({
      headsign: busTrips.tripHeadsign,
      departureTimeSeconds: busStopTimes.departureTimeSeconds,
    })
    .from(busStopTimes)
    .innerJoin(
      busTrips,
      and(
        eq(busStopTimes.tripId, busTrips.tripId),
        eq(busStopTimes.providerId, busTrips.providerId),
        eq(busStopTimes.gtfsVersionId, busTrips.gtfsVersionId)
      )
    )
    .where(
      and(
        eq(busStopTimes.providerId, providerId),
        eq(busStopTimes.gtfsVersionId, versionId),
        inArray(busStopTimes.stopId, stopIds),
        inArray(busTrips.serviceId, serviceIds),
        isNotNull(busStopTimes.departureTimeSeconds)
      )
    )
    .orderBy(busStopTimes.departureTimeSeconds)

  // headsign ごとにグループ化して時刻表を構築
  const byHeadsign = new Map<string, Set<number>>()
  for (const row of rows) {
    const key = row.headsign ?? '（方面不明）'
    if (!byHeadsign.has(key)) byHeadsign.set(key, new Set())
    if (row.departureTimeSeconds != null) byHeadsign.get(key)!.add(row.departureTimeSeconds)
  }

  const data: TimetableDirection[] = Array.from(byHeadsign.entries()).map(([headsign, secondsSet]) => {
    const sorted = [...secondsSet].sort((a, b) => a - b)

    const hourMap = new Map<number, number[]>()
    for (const s of sorted) {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      if (!hourMap.has(h)) hourMap.set(h, [])
      hourMap.get(h)!.push(m)
    }

    const entries = Array.from(hourMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, minutes]) => ({ hour, minutes }))

    const lastSeconds = sorted.at(-1) ?? 0
    const lastH = Math.floor(lastSeconds / 3600)
    const lastM = Math.floor((lastSeconds % 3600) / 60)

    return { headsign, entries, lastDeparture: { hour: lastH, minute: lastM } }
  })

  return NextResponse.json({ success: true, data }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}

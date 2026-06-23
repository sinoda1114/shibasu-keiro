import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { busStops, busStopTimes } from '@/lib/db/schema'
import {
  getActiveVersionId,
  secondsToHHMM,
  todayYYYYMMDD,
} from '@/lib/gtfs/service-resolver'

export interface TripStop {
  stopName: string
  arrivalTimeSeconds: number | null
  departureTimeSeconds: number | null
  arrivalTime: string | null
  departureTime: string | null
  stopSequence: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const tripId = searchParams.get('tripId')?.trim()
  const fromName = searchParams.get('from')?.trim()
  const toName = searchParams.get('to')?.trim()
  const dateStr = searchParams.get('date') ?? todayYYYYMMDD()
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!tripId || !fromName || !toName) {
    return NextResponse.json(
      { success: false, error: 'tripId, from, to は必須です' },
      { status: 400 }
    )
  }

  const versionId = await getActiveVersionId(providerId)
  if (!versionId) {
    return NextResponse.json(
      { success: false, error: 'データが利用できません' },
      { status: 503 }
    )
  }

  const rows = await db
    .select({
      stopName: busStops.stopName,
      arrivalTimeSeconds: busStopTimes.arrivalTimeSeconds,
      departureTimeSeconds: busStopTimes.departureTimeSeconds,
      stopSequence: busStopTimes.stopSequence,
    })
    .from(busStopTimes)
    .innerJoin(
      busStops,
      and(
        eq(busStopTimes.stopId, busStops.stopId),
        eq(busStopTimes.providerId, busStops.providerId),
        eq(busStopTimes.gtfsVersionId, busStops.gtfsVersionId)
      )
    )
    .where(
      and(
        eq(busStopTimes.providerId, providerId),
        eq(busStopTimes.gtfsVersionId, versionId),
        eq(busStopTimes.tripId, tripId)
      )
    )
    .orderBy(busStopTimes.stopSequence)

  const fromIdx = rows.findIndex((r) => r.stopName === fromName)
  let toIdx = -1
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].stopName === toName) { toIdx = i; break }
  }

  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) {
    return NextResponse.json({ success: true, data: [] })
  }

  const data: TripStop[] = rows.slice(fromIdx, toIdx + 1).map((r) => ({
    stopName: r.stopName,
    arrivalTimeSeconds: r.arrivalTimeSeconds,
    departureTimeSeconds: r.departureTimeSeconds,
    arrivalTime: r.arrivalTimeSeconds != null ? secondsToHHMM(r.arrivalTimeSeconds) : null,
    departureTime: r.departureTimeSeconds != null ? secondsToHHMM(r.departureTimeSeconds) : null,
    stopSequence: r.stopSequence,
  }))

  return NextResponse.json({ success: true, data }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}

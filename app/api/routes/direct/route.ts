import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, lt, isNotNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db/client'
import { busStops, busStopTimes, busTrips } from '@/lib/db/schema'
import {
  getActiveVersionId,
  resolveServiceIds,
  secondsToHHMM,
  todayYYYYMMDD,
} from '@/lib/gtfs/service-resolver'

export interface DirectRouteResult {
  tripId: string
  routeId: string
  headsign: string | null
  departureStopName: string
  arrivalStopName: string
  departureTime: string
  arrivalTime: string
  departureSeconds: number
  arrivalSeconds: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fromName = searchParams.get('from')?.trim()
  const toName = searchParams.get('to')?.trim()
  const dateStr = searchParams.get('date') ?? todayYYYYMMDD()
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!fromName || !toName) {
    return NextResponse.json(
      { success: false, error: 'from と to は必須です' },
      { status: 400 }
    )
  }

  if (!/^\d{8}$/.test(dateStr)) {
    return NextResponse.json(
      { success: false, error: 'date は YYYYMMDD 形式で指定してください' },
      { status: 400 }
    )
  }

  const versionId = await getActiveVersionId(providerId)
  if (!versionId) {
    return NextResponse.json(
      { success: false, error: 'データが利用できません。インポートをお待ちください。' },
      { status: 503 }
    )
  }

  const serviceIds = await resolveServiceIds(providerId, versionId, dateStr)
  if (serviceIds.length === 0) {
    return NextResponse.json({ success: true, data: [], date: dateStr })
  }

  const [fromStops, toStops] = await Promise.all([
    db
      .select({ stopId: busStops.stopId })
      .from(busStops)
      .where(and(
        eq(busStops.providerId, providerId),
        eq(busStops.gtfsVersionId, versionId),
        eq(busStops.stopName, fromName)
      )),
    db
      .select({ stopId: busStops.stopId })
      .from(busStops)
      .where(and(
        eq(busStops.providerId, providerId),
        eq(busStops.gtfsVersionId, versionId),
        eq(busStops.stopName, toName)
      )),
  ])

  if (fromStops.length === 0 || toStops.length === 0) {
    return NextResponse.json({ success: true, data: [], date: dateStr })
  }

  const fromIds = fromStops.map((s) => s.stopId)
  const toIds = toStops.map((s) => s.stopId)

  // 自己結合: 同一 trip で from → to (stopSequence: from < to)
  const fromSt = alias(busStopTimes, 'from_st')
  const toSt = alias(busStopTimes, 'to_st')
  const tripsAlias = alias(busTrips, 't')

  const rows = await db
    .select({
      tripId: fromSt.tripId,
      routeId: tripsAlias.routeId,
      headsign: tripsAlias.tripHeadsign,
      depSec: fromSt.departureTimeSeconds,
      arrSec: toSt.arrivalTimeSeconds,
    })
    .from(fromSt)
    .innerJoin(
      toSt,
      and(
        eq(fromSt.tripId, toSt.tripId),
        eq(fromSt.providerId, toSt.providerId),
        eq(fromSt.gtfsVersionId, toSt.gtfsVersionId),
        lt(fromSt.stopSequence, toSt.stopSequence)
      )
    )
    .innerJoin(
      tripsAlias,
      and(
        eq(fromSt.tripId, tripsAlias.tripId),
        eq(fromSt.providerId, tripsAlias.providerId),
        eq(fromSt.gtfsVersionId, tripsAlias.gtfsVersionId)
      )
    )
    .where(
      and(
        eq(fromSt.providerId, providerId),
        eq(fromSt.gtfsVersionId, versionId),
        inArray(fromSt.stopId, fromIds),
        inArray(toSt.stopId, toIds),
        inArray(tripsAlias.serviceId, serviceIds),
        isNotNull(fromSt.departureTimeSeconds),
        isNotNull(toSt.arrivalTimeSeconds)
      )
    )
    .orderBy(fromSt.departureTimeSeconds)
    .limit(100)

  const data: DirectRouteResult[] = rows.map((r) => ({
    tripId: r.tripId,
    routeId: r.routeId,
    headsign: r.headsign,
    departureStopName: fromName,
    arrivalStopName: toName,
    departureTime: secondsToHHMM(r.depSec!),
    arrivalTime: secondsToHHMM(r.arrSec!),
    departureSeconds: r.depSec!,
    arrivalSeconds: r.arrSec!,
  }))

  return NextResponse.json({ success: true, data, date: dateStr })
}

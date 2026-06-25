import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, lt, isNotNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db/client'
import { busRoutes, busStops, busStopTimes, busTrips } from '@/lib/db/schema'
import {
  getActiveVersionId,
  resolveServiceIds,
  secondsToHHMM,
  todayYYYYMMDD,
} from '@/lib/gtfs/service-resolver'
import { getAreaConfig } from '@/lib/providers/providers'

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
  providerId: string
  providerDisplayName: string
}

async function queryOneProvider(
  providerId: string,
  fromName: string,
  toName: string,
  dateStr: string
): Promise<DirectRouteResult[]> {
  const versionId = await getActiveVersionId(providerId)
  if (!versionId) return []

  const serviceIds = await resolveServiceIds(providerId, versionId, dateStr)
  if (serviceIds.length === 0) return []

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

  if (fromStops.length === 0 || toStops.length === 0) return []

  const fromIds = fromStops.map((s) => s.stopId)
  const toIds = toStops.map((s) => s.stopId)

  const fromSt = alias(busStopTimes, 'from_st')
  const toSt = alias(busStopTimes, 'to_st')
  const tripsAlias = alias(busTrips, 't')
  const routesAlias = alias(busRoutes, 'r')

  const rows = await db
    .select({
      tripId: fromSt.tripId,
      routeId: tripsAlias.routeId,
      routeShortName: routesAlias.routeShortName,
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
    .leftJoin(
      routesAlias,
      and(
        eq(tripsAlias.routeId, routesAlias.routeId),
        eq(tripsAlias.providerId, routesAlias.providerId),
        eq(tripsAlias.gtfsVersionId, routesAlias.gtfsVersionId)
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
    .limit(500)

  const providerDisplayName =
    providerId === 'nagoya_city_bus' ? '名古屋市バス'
    : providerId === 'yokohama_city_bus' ? '横浜市営バス'
    : providerId === 'sotetsu_bus' ? '相鉄バス'
    : providerId

  return rows.map((r) => ({
    tripId: r.tripId,
    routeId: r.routeShortName ?? r.routeId,
    headsign: r.headsign,
    departureStopName: fromName,
    arrivalStopName: toName,
    departureTime: secondsToHHMM(r.depSec!),
    arrivalTime: secondsToHHMM(r.arrSec!),
    departureSeconds: r.depSec!,
    arrivalSeconds: r.arrSec!,
    providerId,
    providerDisplayName,
  }))
}

async function checkSotetsuStopsExist(fromName: string, toName: string): Promise<boolean> {
  const versionId = await getActiveVersionId('sotetsu_bus')
  if (!versionId) return false
  const [fromStops, toStops] = await Promise.all([
    db.select({ stopId: busStops.stopId }).from(busStops)
      .where(and(eq(busStops.providerId, 'sotetsu_bus'), eq(busStops.gtfsVersionId, versionId), eq(busStops.stopName, fromName))),
    db.select({ stopId: busStops.stopId }).from(busStops)
      .where(and(eq(busStops.providerId, 'sotetsu_bus'), eq(busStops.gtfsVersionId, versionId), eq(busStops.stopName, toName))),
  ])
  return fromStops.length > 0 && toStops.length > 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fromName = searchParams.get('from')?.trim()
  const toName = searchParams.get('to')?.trim()
  const dateStr = searchParams.get('date') ?? todayYYYYMMDD()
  const areaId = searchParams.get('area') ?? 'nagoya'

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

  const area = getAreaConfig(areaId)
  const results = await Promise.all(
    area.providerIds.map((pid) => queryOneProvider(pid, fromName, toName, dateStr))
  )

  const data = results
    .flat()
    .sort((a, b) => a.departureSeconds - b.departureSeconds)

  const hasSotetsu = area.providerIds.includes('sotetsu_bus')
  const sotetsuStopsExist = hasSotetsu && data.length === 0
    ? await checkSotetsuStopsExist(fromName, toName)
    : false

  return NextResponse.json({ success: true, data, date: dateStr, sotetsuStopsExist }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}

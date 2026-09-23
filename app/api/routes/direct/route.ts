import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, lt, isNotNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { getDb } from '@/lib/db/client'
import { busRoutes, busStops, busStopTimes, busTrips } from '@/lib/db/schema'
import {
  getActiveVersionId,
  resolveServiceIds,
  secondsToHHMM,
} from '@/lib/gtfs/service-resolver'
import { getAreaConfig, providerIdToDisplayName } from '@/lib/providers/providers'
import { formatJstYYYYMMDD } from '@/lib/jst'
import { collectProviderResults } from '@/app/api/routes/provider-results'

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
): Promise<DirectRouteResult[] | null> {
  // 版が無い（インポートの障害）ときは null。便が無い空配列と区別する
  const versionId = await getActiveVersionId(providerId)
  if (!versionId) return null

  const serviceIds = await resolveServiceIds(providerId, versionId, dateStr)
  if (serviceIds.length === 0) return []

  const [fromStops, toStops] = await Promise.all([
    getDb()
      .select({ stopId: busStops.stopId })
      .from(busStops)
      .where(and(
        eq(busStops.providerId, providerId),
        eq(busStops.gtfsVersionId, versionId),
        eq(busStops.stopName, fromName)
      )),
    getDb()
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

  const rows = await getDb()
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

  const providerDisplayName = providerIdToDisplayName(providerId)

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
    getDb().select({ stopId: busStops.stopId }).from(busStops)
      .where(and(eq(busStops.providerId, 'sotetsu_bus'), eq(busStops.gtfsVersionId, versionId), eq(busStops.stopName, fromName))),
    getDb().select({ stopId: busStops.stopId }).from(busStops)
      .where(and(eq(busStops.providerId, 'sotetsu_bus'), eq(busStops.gtfsVersionId, versionId), eq(busStops.stopName, toName))),
  ])
  return fromStops.length > 0 && toStops.length > 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fromName = searchParams.get('from')?.trim()
  const toName = searchParams.get('to')?.trim()
  const dateStr = searchParams.get('date') ?? formatJstYYYYMMDD()
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
  const outcome = collectProviderResults(
    'api/routes/direct',
    area.providerIds,
    await Promise.all(area.providerIds.map((pid) => queryOneProvider(pid, fromName, toName, dateStr)))
  )
  if (!outcome.ok) return outcome.response

  const data = outcome.results
    .flat()
    .sort((a, b) => a.departureSeconds - b.departureSeconds)

  const hasSotetsu = area.providerIds.includes('sotetsu_bus')
  const sotetsuStopsExist = hasSotetsu && data.length === 0
    ? await checkSotetsuStopsExist(fromName, toName)
    : false

  // 一部の事業者が欠けた結果は、データが戻った後も CDN に残り続けないようキャッシュしない
  const cacheControl = outcome.hasMissingProvider
    ? 'no-store'
    : 's-maxage=3600, stale-while-revalidate=86400'
  return NextResponse.json({ success: true, data, date: dateStr, sotetsuStopsExist }, {
    headers: { 'Cache-Control': cacheControl },
  })
}

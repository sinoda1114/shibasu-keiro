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
import { formatJstYYYYMMDD, isYYYYMMDD } from '@/lib/jst'
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

export interface DirectRouteResponse {
  success: true
  data: DirectRouteResult[]
  date: string
  sotetsuStopsExist: boolean
  /** 有効な GTFS の版が無く、検索できなかった事業者の ID。欠けが無ければ空配列 */
  missingProviders: string[]
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
  const dateParam = searchParams.get('date')
  const dateStr = dateParam ?? formatJstYYYYMMDD()
  const areaId = searchParams.get('area') ?? 'nagoya'

  if (!fromName || !toName) {
    return NextResponse.json(
      { success: false, error: 'from と to は必須です' },
      { status: 400 }
    )
  }

  // 存在しない日付を曜日の計算で別の日に読み替えて黙って返さない（時刻表と同じ判定）
  if (!isYYYYMMDD(dateStr)) {
    return NextResponse.json(
      { success: false, error: 'date は YYYYMMDD 形式の実在する日付で指定してください' },
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

  const { missingProviders } = outcome
  // 版の無い相鉄バスは調べない（「バス停はあるが未収録」ではなく missingProviders の注意書きで伝える）
  const hasSotetsu = area.providerIds.includes('sotetsu_bus') && !missingProviders.includes('sotetsu_bus')
  const sotetsuStopsExist = hasSotetsu && data.length === 0
    ? await checkSotetsuStopsExist(fromName, toName)
    : false

  // 一部の事業者が欠けた結果は、データが戻った後も CDN に残り続けないようキャッシュしない。
  // 日付なしの URL も、日付が変わると別の結果を指すので CDN に残さない
  const cacheControl = missingProviders.length > 0 || dateParam === null
    ? 'no-store'
    : 's-maxage=3600, stale-while-revalidate=86400'
  const body: DirectRouteResponse = { success: true, data, date: dateStr, sotetsuStopsExist, missingProviders }
  return NextResponse.json(body, {
    headers: { 'Cache-Control': cacheControl },
  })
}

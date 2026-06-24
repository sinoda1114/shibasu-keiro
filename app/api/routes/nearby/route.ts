import { NextRequest, NextResponse } from 'next/server'
import { and, between, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/lib/db/client'
import { busRoutes, busStops, busStopTimes, busTrips } from '@/lib/db/schema'
import {
  getActiveVersionId,
  resolveServiceIds,
  secondsToHHMM,
  todayYYYYMMDD,
} from '@/lib/gtfs/service-resolver'

export interface NearbyTrip {
  tripId: string
  routeId: string
  headsign: string | null
  departureTime: string
  arrivalTime: string
  departureSeconds: number
  arrivalSeconds: number
}

export interface NearbyStop {
  stopName: string
  distanceM: number
  trips: NearbyTrip[]
}

export interface NearbyRouteResponse {
  success: boolean
  data: NearbyStop[]
  date: string
}

// 500m の緯度・経度オフセット（概算）
const LAT_DELTA = 500 / 111000       // ≒ 0.0045°
const LON_DELTA = 500 / 91000        // ≒ 0.0055°（北緯35°付近）

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const latStr = searchParams.get('lat')
  const lonStr = searchParams.get('lon')
  const toName = searchParams.get('to')?.trim()
  const dateStr = searchParams.get('date') ?? todayYYYYMMDD()
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!latStr || !lonStr || !toName) {
    return NextResponse.json(
      { success: false, error: 'lat・lon・to は必須です' },
      { status: 400 }
    )
  }

  const lat = parseFloat(latStr)
  const lon = parseFloat(lonStr)
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { success: false, error: 'lat・lon は数値で指定してください' },
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

  // 1. バウンディングボックスで近隣バス停を取得（stop_name ごとにまとめる）
  const nearbyRaw = await db
    .selectDistinct({
      stopId: busStops.stopId,
      stopName: busStops.stopName,
      stopLat: busStops.stopLat,
      stopLon: busStops.stopLon,
    })
    .from(busStops)
    .where(
      and(
        eq(busStops.providerId, providerId),
        eq(busStops.gtfsVersionId, versionId),
        between(busStops.stopLat, lat - LAT_DELTA, lat + LAT_DELTA),
        between(busStops.stopLon, lon - LON_DELTA, lon + LON_DELTA),
        isNotNull(busStops.stopLat),
        isNotNull(busStops.stopLon)
      )
    )

  if (nearbyRaw.length === 0) {
    return NextResponse.json({ success: true, data: [], date: dateStr })
  }

  // 2. 正確な距離で 500m 以内に絞り込み、距離でソート
  const nearbyStops = nearbyRaw
    .map((s) => ({
      ...s,
      distanceM: haversineM(lat, lon, s.stopLat!, s.stopLon!),
    }))
    .filter((s) => s.distanceM <= 500)
    .sort((a, b) => a.distanceM - b.distanceM)

  if (nearbyStops.length === 0) {
    return NextResponse.json({ success: true, data: [], date: dateStr })
  }

  // 3. 目的地の stopId を取得
  const toStops = await db
    .select({ stopId: busStops.stopId })
    .from(busStops)
    .where(
      and(
        eq(busStops.providerId, providerId),
        eq(busStops.gtfsVersionId, versionId),
        eq(busStops.stopName, toName)
      )
    )

  if (toStops.length === 0) {
    return NextResponse.json({ success: true, data: [], date: dateStr })
  }
  const toIds = toStops.map((s) => s.stopId)

  // 4. 近隣バス停ごとに直通便を検索（stop_name でまとめた stopId 群を使用）
  // 同名停留所（複数 stopId）をまとめて処理する
  const stopNameToIds = new Map<string, string[]>()
  for (const s of nearbyStops) {
    const ids = stopNameToIds.get(s.stopName) ?? []
    ids.push(s.stopId)
    stopNameToIds.set(s.stopName, ids)
  }

  const fromSt = alias(busStopTimes, 'from_st')
  const toSt = alias(busStopTimes, 'to_st')
  const tripsAlias = alias(busTrips, 't')
  const routesAlias = alias(busRoutes, 'r')

  const allFromIds = nearbyStops.map((s) => s.stopId)

  const rows = await db
    .select({
      fromStopId: fromSt.stopId,
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
        inArray(fromSt.stopId, allFromIds),
        inArray(toSt.stopId, toIds),
        inArray(tripsAlias.serviceId, serviceIds),
        isNotNull(fromSt.departureTimeSeconds),
        isNotNull(toSt.arrivalTimeSeconds)
      )
    )
    .orderBy(fromSt.departureTimeSeconds)

  // 5. stopId → stopName のマップを作り、結果をバス停ごとにグループ化
  const stopIdToName = new Map(nearbyStops.map((s) => [s.stopId, s.stopName]))
  const tripsByStopName = new Map<string, NearbyTrip[]>()

  for (const r of rows) {
    const stopName = stopIdToName.get(r.fromStopId)
    if (!stopName) continue
    const trips = tripsByStopName.get(stopName) ?? []
    trips.push({
      tripId: r.tripId,
      routeId: r.routeShortName ?? r.routeId,
      headsign: r.headsign,
      departureTime: secondsToHHMM(r.depSec!),
      arrivalTime: secondsToHHMM(r.arrSec!),
      departureSeconds: r.depSec!,
      arrivalSeconds: r.arrSec!,
    })
    tripsByStopName.set(stopName, trips)
  }

  // 6. 距離順でまとめ、直通便がある停留所のみ返す
  const seen = new Set<string>()
  const data: NearbyStop[] = []
  for (const s of nearbyStops) {
    if (seen.has(s.stopName)) continue
    seen.add(s.stopName)
    const trips = tripsByStopName.get(s.stopName)
    if (!trips || trips.length === 0) continue
    data.push({
      stopName: s.stopName,
      distanceM: Math.round(s.distanceM),
      trips,
    })
  }

  return NextResponse.json({ success: true, data, date: dateStr })
}

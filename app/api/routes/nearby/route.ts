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
import { getAreaConfig } from '@/lib/providers/providers'

export interface NearbyTrip {
  tripId: string
  routeId: string
  headsign: string | null
  departureTime: string
  arrivalTime: string
  departureSeconds: number
  arrivalSeconds: number
  providerId: string
  providerDisplayName: string
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

async function queryOneProvider(
  providerId: string,
  lat: number,
  lon: number,
  toName: string,
  dateStr: string
): Promise<NearbyStop[]> {
  const versionId = await getActiveVersionId(providerId)
  if (!versionId) return []

  const serviceIds = await resolveServiceIds(providerId, versionId, dateStr)
  if (serviceIds.length === 0) return []

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

  if (nearbyRaw.length === 0) return []

  const nearbyStops = nearbyRaw
    .map((s) => ({
      ...s,
      distanceM: haversineM(lat, lon, s.stopLat!, s.stopLon!),
    }))
    .filter((s) => s.distanceM <= 500)
    .sort((a, b) => a.distanceM - b.distanceM)

  if (nearbyStops.length === 0) return []

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

  if (toStops.length === 0) return []
  const toIds = toStops.map((s) => s.stopId)

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

  const providerDisplayName =
    providerId === 'nagoya_city_bus' ? '名古屋市バス'
    : providerId === 'yokohama_city_bus' ? '横浜市営バス'
    : providerId === 'sotetsu_bus' ? '相鉄バス'
    : providerId

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
      providerId,
      providerDisplayName,
    })
    tripsByStopName.set(stopName, trips)
  }

  const seen = new Set<string>()
  const result: NearbyStop[] = []
  for (const s of nearbyStops) {
    if (seen.has(s.stopName)) continue
    seen.add(s.stopName)
    const trips = tripsByStopName.get(s.stopName)
    if (!trips || trips.length === 0) continue
    result.push({
      stopName: s.stopName,
      distanceM: Math.round(s.distanceM),
      trips,
    })
  }

  return result
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const latStr = searchParams.get('lat')
  const lonStr = searchParams.get('lon')
  const toName = searchParams.get('to')?.trim()
  const dateStr = searchParams.get('date') ?? todayYYYYMMDD()
  const areaId = searchParams.get('area') ?? 'nagoya'

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

  const area = getAreaConfig(areaId)
  const results = await Promise.all(
    area.providerIds.map((pid) => queryOneProvider(pid, lat, lon, toName, dateStr))
  )

  // 全プロバイダーの NearbyStop をマージ: 同stopName は distanceM が小さい方を代表に
  const merged = new Map<string, NearbyStop>()
  for (const stops of results) {
    for (const stop of stops) {
      const existing = merged.get(stop.stopName)
      if (!existing) {
        merged.set(stop.stopName, { ...stop })
      } else {
        if (stop.distanceM < existing.distanceM) {
          existing.distanceM = stop.distanceM
        }
        existing.trips = [...existing.trips, ...stop.trips]
        existing.trips.sort((a, b) => a.departureSeconds - b.departureSeconds)
      }
    }
  }

  const data = Array.from(merged.values()).sort((a, b) => a.distanceM - b.distanceM)

  return NextResponse.json({ success: true, data, date: dateStr })
}

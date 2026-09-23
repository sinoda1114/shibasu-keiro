// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { getDb } from '@/lib/db/client'
import {
  busStopTimes, busStops, busTrips, gtfsCalendar, gtfsVersions, providers,
} from '@/lib/db/schema'
import { GET as directRoutes } from '@/app/api/routes/direct/route'
import { GET as nearbyRoutes } from '@/app/api/routes/nearby/route'

// 事業者に有効な GTFS の版が無い（インポートの障害）ときの /api/routes/direct・/api/routes/nearby（#70）。
// 版の有無は getActiveVersionId がプロセス内でキャッシュするため、db-routes.test.ts とは別ファイル・別 DB で検証する。
// この DB の状態:
//   名古屋エリア（名古屋市バスのみ）: 版が 1 つも無い → 全事業者に版が無い
//   横浜エリア: 横浜市営バスは有効な版あり、相鉄バスはアーカイブ済みの版しか無い → 一部の事業者だけ版が無い

const THURSDAY = '20260924'
const NOW = '2026-01-01T00:00:00Z'
// 横浜駅前のバス停の座標と、そこから 100m ほどの地点
const YOKOHAMA_STA = { lat: 35.4658, lon: 139.6223 }
const NEAR_YOKOHAMA_STA = { lat: 35.4667, lon: 139.6223 }

let dir: string
let errorSpy: MockInstance<typeof console.error>
let warnSpy: MockInstance<typeof console.warn>

function hhmm(h: number, m: number) {
  return h * 3600 + m * 60
}

async function seed() {
  const db = getDb()
  await db.insert(providers).values([
    { id: 'yokohama_city_bus', name: 'yokohama', displayName: '横浜市営バス', areaName: '横浜市', createdAt: NOW, updatedAt: NOW },
    { id: 'sotetsu_bus', name: 'sotetsu', displayName: '相鉄バス', areaName: '横浜市', createdAt: NOW, updatedAt: NOW },
  ])
  await db.insert(gtfsVersions).values([
    { id: 'yc-active', providerId: 'yokohama_city_bus', versionName: 'v1', sourceUrl: 'x', status: 'active', createdAt: NOW },
    { id: 'st-old', providerId: 'sotetsu_bus', versionName: 'v1', sourceUrl: 'x', status: 'archived', createdAt: NOW },
  ])
  const weekdays = { monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0 }
  await db.insert(gtfsCalendar).values([
    { id: 'c1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'WD', ...weekdays, startDate: '20260101', endDate: '20261231' },
    { id: 'c2', providerId: 'sotetsu_bus', gtfsVersionId: 'st-old', serviceId: 'WD', ...weekdays, startDate: '20260101', endDate: '20261231' },
  ])
  await db.insert(busStops).values([
    { id: 's1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', stopId: 'A', stopName: '横浜駅前', stopLat: YOKOHAMA_STA.lat, stopLon: YOKOHAMA_STA.lon, createdAt: NOW },
    { id: 's2', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', stopId: 'B', stopName: '高島町', stopLat: 35.4585, stopLon: 139.6275, createdAt: NOW },
    // アーカイブ済みの版の便。版が無い事業者の結果として混ざらないことを確かめる
    { id: 's3', providerId: 'sotetsu_bus', gtfsVersionId: 'st-old', stopId: 'W', stopName: '横浜駅前', stopLat: YOKOHAMA_STA.lat, stopLon: YOKOHAMA_STA.lon, createdAt: NOW },
    { id: 's4', providerId: 'sotetsu_bus', gtfsVersionId: 'st-old', stopId: 'U', stopName: '高島町', stopLat: 35.4585, stopLon: 139.6275, createdAt: NOW },
  ])
  await db.insert(busTrips).values([
    { id: 't1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T1', routeId: 'R1', serviceId: 'WD', tripHeadsign: '高島町', createdAt: NOW },
    { id: 't2', providerId: 'sotetsu_bus', gtfsVersionId: 'st-old', tripId: 'S1', routeId: 'RS', serviceId: 'WD', tripHeadsign: '高島町', createdAt: NOW },
  ])
  await db.insert(busStopTimes).values([
    { id: 'st1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T1', stopId: 'A', arrivalTimeSeconds: hhmm(8, 0), departureTimeSeconds: hhmm(8, 0), stopSequence: 1, createdAt: NOW },
    { id: 'st2', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T1', stopId: 'B', arrivalTimeSeconds: hhmm(8, 20), departureTimeSeconds: hhmm(8, 20), stopSequence: 2, createdAt: NOW },
    { id: 'st3', providerId: 'sotetsu_bus', gtfsVersionId: 'st-old', tripId: 'S1', stopId: 'W', arrivalTimeSeconds: hhmm(8, 10), departureTimeSeconds: hhmm(8, 10), stopSequence: 1, createdAt: NOW },
    { id: 'st4', providerId: 'sotetsu_bus', gtfsVersionId: 'st-old', tripId: 'S1', stopId: 'U', arrivalTimeSeconds: hhmm(8, 30), departureTimeSeconds: hhmm(8, 30), stopSequence: 2, createdAt: NOW },
  ])
}

async function getJson(handler: (req: NextRequest) => Promise<Response>, url: string) {
  const res = await handler(new NextRequest(new URL(url, 'http://localhost')))
  return { status: res.status, headers: res.headers, body: await res.json() }
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'shibasu-api-nodata-'))
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'test.db')}`
  await migrate(getDb(), { migrationsFolder: path.resolve(__dirname, '../../../drizzle/migrations') })
  await seed()
})

afterAll(() => {
  getDb().$client.close()
  rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('/api/routes/direct（有効な版が無い事業者がある）', () => {
  it('エリアの全事業者に有効な版が無ければ 503 とエラーの文言を返す（「直通便なし」と区別する）', async () => {
    const { status, headers, body } = await getJson(directRoutes, `/api/routes/direct?from=栄&to=名古屋駅&area=nagoya&date=${THURSDAY}`)
    expect(status).toBe(503)
    expect(body).toEqual({ success: false, error: expect.stringContaining('準備中') })
    // 障害の応答を CDN に残さない
    expect(headers.get('Cache-Control')).toBe('no-store')
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('nagoya_city_bus'))
  })

  it('一部の事業者だけ版が無ければ、版のある事業者の結果を返し、欠けた事業者をログに残す', async () => {
    const { status, headers, body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${THURSDAY}`)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([expect.objectContaining({ tripId: 'T1', providerId: 'yokohama_city_bus', providerDisplayName: '横浜市営バス' })])
    // 欠けた結果を長く CDN に残さない
    expect(headers.get('Cache-Control')).toBe('no-store')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sotetsu_bus'))
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('一部の事業者だけ版が無ければ、応答の missingProviders にその事業者を入れる（画面が「便なし」と誤案内しないように）', async () => {
    const { body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${THURSDAY}`)
    expect(body.missingProviders).toEqual(['sotetsu_bus'])
  })

  it('結果が空でも missingProviders を返す（版の無い相鉄バスは「バス停はあるが未収録」の案内に回さない）', async () => {
    const { status, body } = await getJson(directRoutes, `/api/routes/direct?from=高島町&to=横浜駅前&area=yokohama&date=${THURSDAY}`)
    expect(status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.missingProviders).toEqual(['sotetsu_bus'])
    expect(body.sotetsuStopsExist).toBe(false)
  })
})

describe('/api/routes/nearby（有効な版が無い事業者がある）', () => {
  it('エリアの全事業者に有効な版が無ければ 503 とエラーの文言を返す', async () => {
    const { status, body } = await getJson(nearbyRoutes, `/api/routes/nearby?lat=35.17&lon=136.88&to=名古屋駅&area=nagoya&date=${THURSDAY}`)
    expect(status).toBe(503)
    expect(body).toEqual({ success: false, error: expect.stringContaining('準備中') })
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('nagoya_city_bus'))
  })

  it('一部の事業者だけ版が無ければ、版のある事業者の結果を返し、欠けた事業者をログに残す', async () => {
    const { status, body } = await getJson(
      nearbyRoutes,
      `/api/routes/nearby?lat=${NEAR_YOKOHAMA_STA.lat}&lon=${NEAR_YOKOHAMA_STA.lon}&to=高島町&area=yokohama&date=${THURSDAY}`
    )
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([
      expect.objectContaining({
        stopName: '横浜駅前',
        trips: [expect.objectContaining({ tripId: 'T1', providerDisplayName: '横浜市営バス' })],
      }),
    ])
    expect(body.missingProviders).toEqual(['sotetsu_bus'])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sotetsu_bus'))
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

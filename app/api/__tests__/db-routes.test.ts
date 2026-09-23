// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getDb } from '@/lib/db/client'
import {
  busRoutes, busStopTimes, busStops, busTrips, gtfsCalendar, gtfsCalendarDates, gtfsVersions, providers,
} from '@/lib/db/schema'
import { GET as searchStops } from '@/app/api/stops/search/route'
import { GET as directRoutes } from '@/app/api/routes/direct/route'
import { GET as timetable } from '@/app/api/timetable/route'

// API ルートを実際の SQLite（マイグレーション適用済み）に対してモックなしで叩く。
// 対象は /api/stops/search・/api/routes/direct・/api/timetable。E2E は API を page.route でモックしているため、
// これらのクエリはここで守る。nearby は有効な版が無いときの扱いだけ routes-no-data.test.ts で検証し、
// trip-stops は未検証のまま。

const THURSDAY = '20260924'
const FRIDAY_SUSPENDED = '20260925'
const SATURDAY = '20260926'
const SUNDAY = '20260927'
const SATURDAY_EXTRA = '20261003'
const MONDAY_HOLIDAY = '20261012' // スポーツの日
const TUESDAY_AFTER_HOLIDAY = '20261013'
const TUESDAY_HOLIDAY_WITHOUT_EXCEPTION = '20261103' // 文化の日。この版はこの日の例外を持たない
const NOW = '2026-01-01T00:00:00Z'

let dir: string

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
    { id: 'yc-active', providerId: 'yokohama_city_bus', versionName: 'v2', sourceUrl: 'x', status: 'active', createdAt: NOW },
    { id: 'yc-old', providerId: 'yokohama_city_bus', versionName: 'v1', sourceUrl: 'x', status: 'archived', createdAt: NOW },
    { id: 'st-active', providerId: 'sotetsu_bus', versionName: 'v1', sourceUrl: 'x', status: 'active', createdAt: NOW },
  ])
  const weekdays = { monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0 }
  await db.insert(gtfsCalendar).values([
    { id: 'c1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'WD', ...weekdays, startDate: '20260101', endDate: '20261231' },
    { id: 'c4', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'YSUN', monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 1, startDate: '20260101', endDate: '20261231' },
    { id: 'c2', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', serviceId: 'WD', ...weekdays, startDate: '20260101', endDate: '20261231' },
    { id: 'c3', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', serviceId: 'HOL', monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 1, startDate: '20260101', endDate: '20261231' },
  ])
  await db.insert(gtfsCalendarDates).values([
    { id: 'cd1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'WD', date: FRIDAY_SUSPENDED, exceptionType: 2 },
    { id: 'cd2', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'WD', date: SATURDAY_EXTRA, exceptionType: 1 },
    // 本番の GTFS と同じく、平日の祝日は平日ダイヤを外して休日ダイヤを足す例外で表す
    { id: 'cd3', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'WD', date: MONDAY_HOLIDAY, exceptionType: 2 },
    { id: 'cd4', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', serviceId: 'YHOL', date: MONDAY_HOLIDAY, exceptionType: 1 },
  ])
  await db.insert(busStops).values([
    { id: 's1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', stopId: 'A', stopName: '横浜駅前', createdAt: NOW },
    { id: 's2', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', stopId: 'B', stopName: '高島町', createdAt: NOW },
    { id: 's3', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-old', stopId: 'Z', stopName: '横浜旧停留所', createdAt: NOW },
    { id: 's4', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', stopId: 'W', stopName: '横浜駅西口', createdAt: NOW },
    { id: 's5', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', stopId: 'U', stopName: '梅の木', createdAt: NOW },
  ])
  await db.insert(busRoutes).values([
    { id: 'r1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', routeId: 'R1', routeShortName: '8系統', createdAt: NOW },
  ])
  await db.insert(busTrips).values([
    { id: 't1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T1', routeId: 'R1', serviceId: 'WD', tripHeadsign: '高島町', createdAt: NOW },
    { id: 't4', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T2', routeId: 'R1', serviceId: 'YHOL', tripHeadsign: '高島町', createdAt: NOW },
    { id: 't5', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T3', routeId: 'R1', serviceId: 'YSUN', tripHeadsign: '高島町', createdAt: NOW },
    { id: 't2', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', tripId: 'S1', routeId: 'RS', serviceId: 'WD', tripHeadsign: '梅の木', createdAt: NOW },
    { id: 't3', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', tripId: 'S2', routeId: 'RS', serviceId: 'HOL', tripHeadsign: '梅の木', createdAt: NOW },
  ])
  await db.insert(busStopTimes).values([
    { id: 'st1', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T1', stopId: 'A', arrivalTimeSeconds: hhmm(8, 0), departureTimeSeconds: hhmm(8, 0), stopSequence: 1, createdAt: NOW },
    { id: 'st2', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T1', stopId: 'B', arrivalTimeSeconds: hhmm(8, 20), departureTimeSeconds: hhmm(8, 20), stopSequence: 2, createdAt: NOW },
    { id: 'st7', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T2', stopId: 'A', arrivalTimeSeconds: hhmm(9, 0), departureTimeSeconds: hhmm(9, 0), stopSequence: 1, createdAt: NOW },
    { id: 'st8', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T2', stopId: 'B', arrivalTimeSeconds: hhmm(9, 20), departureTimeSeconds: hhmm(9, 20), stopSequence: 2, createdAt: NOW },
    { id: 'st9', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T3', stopId: 'A', arrivalTimeSeconds: hhmm(10, 0), departureTimeSeconds: hhmm(10, 0), stopSequence: 1, createdAt: NOW },
    { id: 'st10', providerId: 'yokohama_city_bus', gtfsVersionId: 'yc-active', tripId: 'T3', stopId: 'B', arrivalTimeSeconds: hhmm(10, 20), departureTimeSeconds: hhmm(10, 20), stopSequence: 2, createdAt: NOW },
    { id: 'st3', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', tripId: 'S1', stopId: 'W', arrivalTimeSeconds: hhmm(8, 10), departureTimeSeconds: hhmm(8, 10), stopSequence: 1, createdAt: NOW },
    { id: 'st4', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', tripId: 'S1', stopId: 'U', arrivalTimeSeconds: hhmm(8, 40), departureTimeSeconds: hhmm(8, 40), stopSequence: 2, createdAt: NOW },
    { id: 'st5', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', tripId: 'S2', stopId: 'W', arrivalTimeSeconds: hhmm(9, 10), departureTimeSeconds: hhmm(9, 10), stopSequence: 1, createdAt: NOW },
    { id: 'st6', providerId: 'sotetsu_bus', gtfsVersionId: 'st-active', tripId: 'S2', stopId: 'U', arrivalTimeSeconds: hhmm(9, 40), departureTimeSeconds: hhmm(9, 40), stopSequence: 2, createdAt: NOW },
  ])
}

// libsql の非同期処理を止めないよう、偽装するのは Date だけにする
function fixClock(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

async function getResponse(handler: (req: NextRequest) => Promise<Response>, url: string) {
  return handler(new NextRequest(new URL(url, 'http://localhost')))
}

async function getJson(handler: (req: NextRequest) => Promise<Response>, url: string) {
  const res = await handler(new NextRequest(new URL(url, 'http://localhost')))
  return { status: res.status, body: await res.json() }
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'shibasu-api-'))
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'test.db')}`
  await migrate(getDb(), { migrationsFolder: path.resolve(__dirname, '../../../drizzle/migrations') })
  await seed()
})

afterAll(() => {
  getDb().$client.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('/api/stops/search（実 DB）', () => {
  it('エリア内の全事業者の有効版からバス停名を部分一致で返す', async () => {
    const { status, body } = await getJson(searchStops, '/api/stops/search?q=横浜&area=yokohama')
    expect(status).toBe(200)
    expect(body.data.map((s: { stopName: string }) => s.stopName).sort()).toEqual(['横浜駅前', '横浜駅西口'])
  })

  it('アーカイブ済みの版のバス停は返さない', async () => {
    const { body } = await getJson(searchStops, '/api/stops/search?q=旧&area=yokohama')
    expect(body.data).toEqual([])
  })
})

describe('/api/routes/direct（実 DB）', () => {
  it('平日は横浜市営バスの直通便を事業者名と時刻付きで返す', async () => {
    const { status, body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${THURSDAY}`)
    expect(status).toBe(200)
    expect(body.data).toEqual([expect.objectContaining({
      tripId: 'T1', routeId: '8系統', departureTime: '08:00', arrivalTime: '08:20',
      providerId: 'yokohama_city_bus', providerDisplayName: '横浜市営バス',
    })])
  })

  it('同じエリアの別事業者（相鉄バス）の便は相鉄バスとして返す', async () => {
    const { body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅西口&to=梅の木&area=yokohama&date=${THURSDAY}`)
    expect(body.data).toEqual([expect.objectContaining({ tripId: 'S1', providerDisplayName: '相鉄バス' })])
  })

  it('エリアの全事業者に有効な版があれば missingProviders は空配列', async () => {
    const { body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${THURSDAY}`)
    expect(body.missingProviders).toEqual([])
  })

  it('逆方向（停車順が逆）は直通便として返さない', async () => {
    const { body } = await getJson(directRoutes, `/api/routes/direct?from=高島町&to=横浜駅前&area=yokohama&date=${THURSDAY}`)
    expect(body.data).toEqual([])
  })

  it('運行曜日でない日（土曜）は返さない', async () => {
    const { body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${SATURDAY}`)
    expect(body.data).toEqual([])
  })

  it('calendar_dates の例外を反映する（平日の運休・土曜の臨時運行）', async () => {
    const suspended = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${FRIDAY_SUSPENDED}`)
    expect(suspended.body.data).toEqual([])
    const extra = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${SATURDAY_EXTRA}`)
    expect(extra.body.data).toHaveLength(1)
  })

  it('日付ごとの例外を持たない事業者（相鉄バス）は、平日の祝日を日曜のダイヤで扱う', async () => {
    const holiday = await getJson(directRoutes, `/api/routes/direct?from=横浜駅西口&to=梅の木&area=yokohama&date=${MONDAY_HOLIDAY}`)
    expect(holiday.body.data.map((r: { tripId: string }) => r.tripId)).toEqual(['S2'])
    const nextDay = await getJson(directRoutes, `/api/routes/direct?from=横浜駅西口&to=梅の木&area=yokohama&date=${TUESDAY_AFTER_HOLIDAY}`)
    expect(nextDay.body.data.map((r: { tripId: string }) => r.tripId)).toEqual(['S1'])
  })

  it('日付ごとの例外を持つ事業者（横浜市営バス）は、祝日を例外のとおりに判定する', async () => {
    const holiday = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${MONDAY_HOLIDAY}`)
    expect(holiday.body.data.map((r: { tripId: string }) => r.tripId)).toEqual(['T2'])
    const nextDay = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${TUESDAY_AFTER_HOLIDAY}`)
    expect(nextDay.body.data.map((r: { tripId: string }) => r.tripId)).toEqual(['T1'])
  })

  it('例外を持つ事業者で、その祝日の例外が無ければ平日ダイヤのまま（祝日も平日ダイヤで走る日をデータで表す）', async () => {
    const { body } = await getJson(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${TUESDAY_HOLIDAY_WITHOUT_EXCEPTION}`)
    expect(body.data.map((r: { tripId: string }) => r.tripId)).toEqual(['T1'])
  })

  it('date を省略したら JST の今日で引く（UTC では 9/24 でも JST では運休の 9/25）', async () => {
    fixClock('2026-09-24T15:30:00Z')
    const { status, body } = await getJson(directRoutes, '/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama')
    expect(status).toBe(200)
    expect(body.date).toBe(FRIDAY_SUSPENDED)
    expect(body.data).toEqual([])
  })

  it('date を省略した応答は CDN に残さない（日付が変わった後に前日の結果を返さない）', async () => {
    const res = await getResponse(directRoutes, '/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('date を指定した応答はキャッシュさせる', async () => {
    const res = await getResponse(directRoutes, `/api/routes/direct?from=横浜駅前&to=高島町&area=yokohama&date=${THURSDAY}`)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=')
  })

  it('date が YYYYMMDD でなければ 400', async () => {
    const { status } = await getJson(directRoutes, '/api/routes/direct?from=a&to=b&area=yokohama&date=2026-09-24')
    expect(status).toBe(400)
  })

  it.each(['20260230', '20261301', '20260900'])('date が存在しない日付（%s）なら 400（時刻表と同じ判定）', async (date) => {
    const { status } = await getJson(directRoutes, `/api/routes/direct?from=a&to=b&area=yokohama&date=${date}`)
    expect(status).toBe(400)
  })
})

describe('/api/timetable（実 DB）', () => {
  const url = (stopName: string, provider: string, date: string) =>
    `/api/timetable?stopName=${stopName}&provider=${provider}&date=${date}`
  const entriesOf = (body: { data: { entries: { hour: number; minutes: number[] }[] }[] }) =>
    body.data.flatMap((d) => d.entries)

  it('date の曜日で運行する便を返す', async () => {
    // 横浜駅前の平日ダイヤは T1（8:00）、日曜の列のダイヤは T3（10:00）
    const weekday = await getJson(timetable, url('横浜駅前', 'yokohama_city_bus', THURSDAY))
    expect(weekday.status).toBe(200)
    expect(entriesOf(weekday.body)).toEqual([{ hour: 8, minutes: [0] }])
    const sunday = await getJson(timetable, url('横浜駅前', 'yokohama_city_bus', SUNDAY))
    expect(entriesOf(sunday.body)).toEqual([{ hour: 10, minutes: [0] }])
  })

  it('calendar_dates の例外を反映する（平日の運休・土曜の臨時運行）', async () => {
    const suspended = await getJson(timetable, url('横浜駅前', 'yokohama_city_bus', FRIDAY_SUSPENDED))
    expect(suspended.status).toBe(200)
    expect(suspended.body.data).toEqual([])
    const extra = await getJson(timetable, url('横浜駅前', 'yokohama_city_bus', SATURDAY_EXTRA))
    expect(entriesOf(extra.body)).toEqual([{ hour: 8, minutes: [0] }])
  })

  it('例外を持つ事業者（横浜市営バス）は、祝日を例外のとおりに判定する（日曜の列に無い休日ダイヤも出す）', async () => {
    const { body } = await getJson(timetable, url('横浜駅前', 'yokohama_city_bus', MONDAY_HOLIDAY))
    expect(entriesOf(body)).toEqual([{ hour: 9, minutes: [0] }])
  })

  it('例外を持たない事業者（相鉄バス）は、平日の祝日を日曜のダイヤで扱う', async () => {
    const holiday = await getJson(timetable, url('横浜駅西口', 'sotetsu_bus', MONDAY_HOLIDAY))
    expect(entriesOf(holiday.body)).toEqual([{ hour: 9, minutes: [10] }])
    const nextDay = await getJson(timetable, url('横浜駅西口', 'sotetsu_bus', TUESDAY_AFTER_HOLIDAY))
    expect(entriesOf(nextDay.body)).toEqual([{ hour: 8, minutes: [10] }])
  })

  it('date を省略したら JST の今日で引く（UTC では 9/24 でも JST では運休の 9/25）', async () => {
    fixClock('2026-09-24T15:30:00Z')
    const { status, body } = await getJson(timetable, '/api/timetable?stopName=横浜駅前&provider=yokohama_city_bus')
    expect(status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('date を省略した応答は CDN に残さない（日付が変わった後に前日の時刻表を返さない）', async () => {
    const res = await getResponse(timetable, '/api/timetable?stopName=横浜駅前&provider=yokohama_city_bus')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('date を指定した応答はキャッシュさせる（運行が無い日の空の応答も）', async () => {
    const running = await getResponse(timetable, url('横浜駅前', 'yokohama_city_bus', THURSDAY))
    expect(running.headers.get('Cache-Control')).toContain('s-maxage=')
    const suspended = await getResponse(timetable, url('横浜駅前', 'yokohama_city_bus', FRIDAY_SUSPENDED))
    expect(suspended.headers.get('Cache-Control')).toContain('s-maxage=')
  })

  it.each(['2026-09-24', '2026092', 'bogus', '20260230', '20261301', '20260900'])(
    'date が %s（YYYYMMDD でない・存在しない日付）なら 400',
    async (date) => {
      const { status } = await getJson(timetable, url('横浜駅前', 'yokohama_city_bus', date))
      expect(status).toBe(400)
    },
  )
})

import { eq } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import {
  providers,
  gtfsVersions,
  gtfsImportJobs,
  busStops,
  busRoutes,
  busTrips,
  busStopTimes,
  gtfsCalendar,
  gtfsCalendarDates,
} from '../../lib/db/schema'
import { generateId, gtfsTimeToSeconds } from './utils'
import {
  parseGtfsFile,
  type GtfsStop,
  type GtfsRoute,
  type GtfsTrip,
  type GtfsStopTime,
  type GtfsCalendar,
  type GtfsCalendarDate,
} from './parse'

const PROVIDER_ID = 'nagoya_city_bus'
const BATCH_SIZE = 500

/**
 * バッチINSERTヘルパー
 */
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function batchInsert<T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: T[],
  batchSize = BATCH_SIZE
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    // 502/サーバーエラー時は指数バックオフでリトライ（最大5回）
    let lastErr: unknown
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.insert(table).values(batch)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        const waitMs = 2000 * 2 ** attempt
        process.stdout.write(`\n  [retry ${attempt + 1}/5] wait ${waitMs}ms...`)
        await sleep(waitMs)
      }
    }
    if (lastErr) throw lastErr
    if (i % 5000 === 0 && i > 0) process.stdout.write('.')
    // 大量書込時に Turso を休ませる（500行ごとに小休止）
    if (i > 0 && i % (batchSize * 10) === 0) await sleep(300)
  }
}

/**
 * GTFSデータをTursoに取り込む
 */
export async function importGtfs(gtfsDir: string, versionName: string): Promise<void> {
  const versionId = generateId()
  const jobId = generateId()
  const now = new Date().toISOString()
  const sourceUrl = process.env.NAGOYA_GTFS_URL ?? ''

  // providers テーブルに nagoya_city_bus が存在しなければ挿入
  const existing = await db
    .select()
    .from(providers)
    .where(eq(providers.id, PROVIDER_ID))
    .limit(1)
  if (existing.length === 0) {
    await db.insert(providers).values({
      id: PROVIDER_ID,
      name: PROVIDER_ID,
      displayName: '名古屋市バス',
      areaName: '名古屋市',
      gtfsSourceUrl: sourceUrl,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    console.log('Inserted provider: nagoya_city_bus')
  }

  // ジョブ開始
  await db.insert(gtfsImportJobs).values({
    id: jobId,
    providerId: PROVIDER_ID,
    gtfsVersionId: versionId,
    status: 'running',
    startedAt: now,
    sourceUrl,
    createdAt: now,
  })

  try {
    // バージョン登録
    await db.insert(gtfsVersions).values({
      id: versionId,
      providerId: PROVIDER_ID,
      versionName,
      sourceUrl,
      status: 'staging',
      createdAt: now,
    })

    // stops
    console.log('\nImporting stops...')
    const stops = parseGtfsFile<GtfsStop>(gtfsDir, 'stops.txt')
    await batchInsert(
      busStops,
      stops.map((s) => ({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        stopId: s.stop_id,
        stopName: s.stop_name,
        stopLat: s.stop_lat ? parseFloat(s.stop_lat) : null,
        stopLon: s.stop_lon ? parseFloat(s.stop_lon) : null,
        createdAt: now,
      }))
    )
    console.log(` ${stops.length} stops`)

    // routes
    console.log('Importing routes...')
    const routes = parseGtfsFile<GtfsRoute>(gtfsDir, 'routes.txt')
    await batchInsert(
      busRoutes,
      routes.map((r) => ({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        routeId: r.route_id,
        routeShortName: r.route_short_name || null,
        routeLongName: r.route_long_name || null,
        createdAt: now,
      }))
    )
    console.log(` ${routes.length} routes`)

    // trips
    console.log('Importing trips...')
    const trips = parseGtfsFile<GtfsTrip>(gtfsDir, 'trips.txt')
    await batchInsert(
      busTrips,
      trips.map((t) => ({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        tripId: t.trip_id,
        routeId: t.route_id,
        serviceId: t.service_id,
        tripHeadsign: t.trip_headsign || null,
        directionId: t.direction_id ? parseInt(t.direction_id) : null,
        createdAt: now,
      }))
    )
    console.log(` ${trips.length} trips`)

    // stop_times（最大データ量、慎重にバッチ処理）
    console.log('Importing stop_times (this may take a while)...')
    const stopTimes = parseGtfsFile<GtfsStopTime>(gtfsDir, 'stop_times.txt')
    await batchInsert(
      busStopTimes,
      stopTimes.map((st) => ({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        tripId: st.trip_id,
        stopId: st.stop_id,
        arrivalTimeSeconds: st.arrival_time ? gtfsTimeToSeconds(st.arrival_time) : null,
        departureTimeSeconds: st.departure_time ? gtfsTimeToSeconds(st.departure_time) : null,
        stopSequence: parseInt(st.stop_sequence),
        createdAt: now,
      })),
      100 // stop_timesは100件ずつ（Turso Free tier 対策）
    )
    console.log(` ${stopTimes.length} stop_times`)

    // calendar
    console.log('Importing calendar...')
    const calendars = parseGtfsFile<GtfsCalendar>(gtfsDir, 'calendar.txt')
    if (calendars.length > 0) {
      await batchInsert(
        gtfsCalendar,
        calendars.map((c) => ({
          id: generateId(),
          providerId: PROVIDER_ID,
          gtfsVersionId: versionId,
          serviceId: c.service_id,
          monday: parseInt(c.monday),
          tuesday: parseInt(c.tuesday),
          wednesday: parseInt(c.wednesday),
          thursday: parseInt(c.thursday),
          friday: parseInt(c.friday),
          saturday: parseInt(c.saturday),
          sunday: parseInt(c.sunday),
          startDate: c.start_date,
          endDate: c.end_date,
        }))
      )
    }
    console.log(` ${calendars.length} calendar entries`)

    // calendar_dates
    console.log('Importing calendar_dates...')
    const calendarDates = parseGtfsFile<GtfsCalendarDate>(gtfsDir, 'calendar_dates.txt')
    if (calendarDates.length > 0) {
      await batchInsert(
        gtfsCalendarDates,
        calendarDates.map((cd) => ({
          id: generateId(),
          providerId: PROVIDER_ID,
          gtfsVersionId: versionId,
          serviceId: cd.service_id,
          date: cd.date,
          exceptionType: parseInt(cd.exception_type),
        }))
      )
    }
    console.log(` ${calendarDates.length} calendar_dates`)

    // バージョンをactiveに更新
    await db
      .update(gtfsVersions)
      .set({ status: 'active', importedAt: new Date().toISOString() })
      .where(eq(gtfsVersions.id, versionId))

    // ジョブ完了
    await db
      .update(gtfsImportJobs)
      .set({ status: 'completed', finishedAt: new Date().toISOString() })
      .where(eq(gtfsImportJobs.id, jobId))

    console.log('\n✓ Import completed successfully!')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db
      .update(gtfsImportJobs)
      .set({ status: 'failed', finishedAt: new Date().toISOString(), errorMessage: msg })
      .where(eq(gtfsImportJobs.id, jobId))
    throw err
  }
}

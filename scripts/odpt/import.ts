import { and, desc, eq, inArray } from 'drizzle-orm'
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
} from '../../lib/db/schema'
import { generateId } from '../gtfs/utils'
import { fetchBusstopPoles, fetchBusroutePatterns, fetchBusTimetables, fetchLatestDcDate } from './fetch'
import type { OdptBusTimetable } from './types'

const PROVIDER_ID = 'sotetsu_bus'
const DISPLAY_NAME = '相鉄バス'
const AREA_NAME = '横浜市'
const SOURCE_URL = 'https://ckan.odpt.org/organization/sotetsu_bus'

const BATCH_SIZE = 500

// ODPT calendar → DB service_id
const CALENDAR_MAP: Record<string, string> = {
  'odpt.Calendar:Weekday': 'weekday',
  'odpt.Calendar:Saturday': 'saturday',
  'odpt.Calendar:Holiday': 'holiday',
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function batchInsert<T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: T[],
  batchSize = BATCH_SIZE
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
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
    if (i > 0 && i % (batchSize * 10) === 0) await sleep(300)
  }
}

function odptTimeToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 3600 + m * 60
}

function extractRouteShortName(dcTitle: string | undefined, routeId: string): string {
  if (dcTitle) {
    const firstToken = dcTitle.split(' ')[0]
    if (firstToken) return firstToken
  }
  // fallback: last segment of odpt:busroute
  return routeId.split('.').at(-1) ?? routeId
}

export async function checkOdptUpdate(
  consumerKey: string
): Promise<{ hasUpdate: boolean; sourceHash: string }> {
  const dcDate = await fetchLatestDcDate(consumerKey)
  const newHash = `odpt:sotetsu:${dcDate ?? new Date().toISOString().split('T')[0]}`

  const latest = await db
    .select({ sourceHash: gtfsVersions.sourceHash })
    .from(gtfsVersions)
    .where(
      and(
        eq(gtfsVersions.providerId, PROVIDER_ID),
        inArray(gtfsVersions.status, ['active', 'archived'])
      )
    )
    .orderBy(desc(gtfsVersions.createdAt))
    .limit(1)

  const prevHash = latest[0]?.sourceHash ?? null
  return { hasUpdate: prevHash !== newHash, sourceHash: newHash }
}

export async function importOdpt(consumerKey: string, sourceHash: string): Promise<string> {
  const versionId = generateId()
  const jobId = generateId()
  const now = new Date().toISOString()
  const versionName = now.split('T')[0]

  // providers テーブルにプロバイダーが存在しなければ挿入
  const existing = await db
    .select()
    .from(providers)
    .where(eq(providers.id, PROVIDER_ID))
    .limit(1)
  if (existing.length === 0) {
    await db.insert(providers).values({
      id: PROVIDER_ID,
      name: PROVIDER_ID,
      displayName: DISPLAY_NAME,
      areaName: AREA_NAME,
      gtfsSourceUrl: SOURCE_URL,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`Inserted provider: ${PROVIDER_ID}`)
  }

  await db.insert(gtfsImportJobs).values({
    id: jobId,
    providerId: PROVIDER_ID,
    gtfsVersionId: versionId,
    status: 'running',
    startedAt: now,
    sourceUrl: SOURCE_URL,
    createdAt: now,
  })

  try {
    await db.insert(gtfsVersions).values({
      id: versionId,
      providerId: PROVIDER_ID,
      versionName,
      sourceUrl: SOURCE_URL,
      sourceHash,
      status: 'staging',
      createdAt: now,
    })

    // --- 1. バス停 ---
    console.log('\nFetching bus stops...')
    const poles = await fetchBusstopPoles(consumerKey)
    console.log(`  ${poles.length} stops fetched. Inserting...`)
    await batchInsert(
      busStops,
      poles.map((p) => ({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        stopId: p['owl:sameAs'],
        stopName: p['dc:title'],
        stopLat: p['geo:lat'] ?? null,
        stopLon: p['geo:long'] ?? null,
        createdAt: now,
      }))
    )
    console.log(`  ✓ ${poles.length} stops`)

    // --- 2. 路線パターン（direction lookup用） ---
    console.log('Fetching route patterns...')
    const patterns = await fetchBusroutePatterns(consumerKey)
    const patternMap = new Map<string, { routeId: string; direction: number }>(
      patterns.map((p) => [
        p['owl:sameAs'],
        { routeId: p['odpt:busroute'], direction: parseInt(p['odpt:direction']) || 0 },
      ])
    )
    console.log(`  ${patterns.length} patterns fetched`)

    // --- 3. 時刻表（trip + stop_times） ---
    console.log('Fetching timetables...')
    const timetables = await fetchBusTimetables(consumerKey)
    console.log(`  ${timetables.length} timetables fetched`)

    // 路線をまとめて重複排除
    const routeShortNameMap = new Map<string, string>()
    for (const tt of timetables) {
      const patternInfo = patternMap.get(tt['odpt:busroutePattern'])
      if (!patternInfo) continue
      if (!routeShortNameMap.has(patternInfo.routeId)) {
        routeShortNameMap.set(
          patternInfo.routeId,
          extractRouteShortName(tt['dc:title'], patternInfo.routeId)
        )
      }
    }

    console.log(`Inserting ${routeShortNameMap.size} routes...`)
    await batchInsert(
      busRoutes,
      Array.from(routeShortNameMap.entries()).map(([routeId, shortName]) => ({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        routeId,
        routeShortName: shortName,
        routeLongName: null,
        createdAt: now,
      }))
    )
    console.log(`  ✓ ${routeShortNameMap.size} routes`)

    // trips
    console.log('Inserting trips...')
    const validTimetables = timetables.filter((tt) => patternMap.has(tt['odpt:busroutePattern']))
    await batchInsert(
      busTrips,
      validTimetables.map((tt) => {
        const patternInfo = patternMap.get(tt['odpt:busroutePattern'])!
        const serviceId = CALENDAR_MAP[tt['odpt:calendar']] ?? 'weekday'
        const headsign = tt['odpt:busTimetableObject']
          .find((o) => o['odpt:destinationSign'])?.['odpt:destinationSign'] ?? null
        return {
          id: generateId(),
          providerId: PROVIDER_ID,
          gtfsVersionId: versionId,
          tripId: tt['owl:sameAs'],
          routeId: patternInfo.routeId,
          serviceId,
          tripHeadsign: headsign,
          directionId: patternInfo.direction,
          createdAt: now,
        }
      })
    )
    console.log(`  ✓ ${validTimetables.length} trips`)

    // stop_times（Tursoへの書込量が最大）
    console.log('Inserting stop_times...')
    const allStopTimes = buildStopTimeRows(validTimetables, versionId, now)
    console.log(`  ${allStopTimes.length} stop_times to insert`)
    await batchInsert(busStopTimes, allStopTimes, 100)
    console.log(`  ✓ ${allStopTimes.length} stop_times`)

    // --- 4. カレンダー（3種類） ---
    console.log('Inserting calendar...')
    const startDate = now.split('T')[0].replace(/-/g, '')
    const endYear = new Date().getFullYear() + 2
    const endDate = `${endYear}1231`
    await batchInsert(gtfsCalendar, [
      {
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        serviceId: 'weekday',
        monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1,
        saturday: 0, sunday: 0,
        startDate,
        endDate,
      },
      {
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        serviceId: 'saturday',
        monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0,
        saturday: 1, sunday: 0,
        startDate,
        endDate,
      },
      {
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        serviceId: 'holiday',
        monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0,
        saturday: 0, sunday: 1,
        startDate,
        endDate,
      },
    ])
    console.log('  ✓ 3 calendar entries (weekday / saturday / holiday)')

    await db
      .update(gtfsImportJobs)
      .set({ status: 'completed', finishedAt: new Date().toISOString() })
      .where(eq(gtfsImportJobs.id, jobId))

    console.log('\n✓ Import completed (staging). Ready to activate.')
    return versionId
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db
      .update(gtfsImportJobs)
      .set({ status: 'failed', finishedAt: new Date().toISOString(), errorMessage: msg })
      .where(eq(gtfsImportJobs.id, jobId))

    try {
      await db.delete(busStopTimes).where(eq(busStopTimes.gtfsVersionId, versionId))
      await db.delete(busTrips).where(eq(busTrips.gtfsVersionId, versionId))
      await db.delete(busRoutes).where(eq(busRoutes.gtfsVersionId, versionId))
      await db.delete(busStops).where(eq(busStops.gtfsVersionId, versionId))
      await db.delete(gtfsCalendar).where(eq(gtfsCalendar.gtfsVersionId, versionId))
      await db.delete(gtfsVersions).where(eq(gtfsVersions.id, versionId))
    } catch (cleanupErr) {
      console.error('クリーンアップ中にエラーが発生しました:', cleanupErr)
    }

    throw err
  }
}

function buildStopTimeRows(
  timetables: OdptBusTimetable[],
  versionId: string,
  now: string
): Array<{
  id: string
  providerId: string
  gtfsVersionId: string
  tripId: string
  stopId: string
  arrivalTimeSeconds: number | null
  departureTimeSeconds: number | null
  stopSequence: number
  createdAt: string
}> {
  const rows = []
  for (const tt of timetables) {
    const tripId = tt['owl:sameAs']
    for (const obj of tt['odpt:busTimetableObject']) {
      rows.push({
        id: generateId(),
        providerId: PROVIDER_ID,
        gtfsVersionId: versionId,
        tripId,
        stopId: obj['odpt:busstopPole'],
        arrivalTimeSeconds: obj['odpt:arrivalTime']
          ? odptTimeToSeconds(obj['odpt:arrivalTime'])
          : null,
        departureTimeSeconds: obj['odpt:departureTime']
          ? odptTimeToSeconds(obj['odpt:departureTime'])
          : null,
        stopSequence: obj['odpt:index'],
        createdAt: now,
      })
    }
  }
  return rows
}

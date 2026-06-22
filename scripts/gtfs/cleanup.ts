import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import {
  gtfsVersions,
  busStops,
  busRoutes,
  busTrips,
  busStopTimes,
  gtfsCalendar,
  gtfsCalendarDates,
  gtfsImportJobs,
} from '../../lib/db/schema'

const KEEP_ARCHIVED = 1 // active 以外に残す世代数

/**
 * 古い archived バージョンとその関連データを削除する。
 * active バージョンは削除しない。KEEP_ARCHIVED 件より古い archived を対象とする。
 */
export async function cleanupOldVersions(providerId: string): Promise<void> {
  const all = await db
    .select({ id: gtfsVersions.id, status: gtfsVersions.status })
    .from(gtfsVersions)
    .where(eq(gtfsVersions.providerId, providerId))
    .orderBy(gtfsVersions.createdAt) // 古い順

  const archived = all.filter((v) => v.status === 'archived')
  if (archived.length <= KEEP_ARCHIVED) {
    console.log(`No cleanup needed (${archived.length} archived ≤ ${KEEP_ARCHIVED})`)
    return
  }

  const toDelete = archived.slice(0, archived.length - KEEP_ARCHIVED).map((v) => v.id)
  console.log(`Cleaning up ${toDelete.length} old version(s): ${toDelete.join(', ')}`)

  // 関連データを FK 依存順に削除
  await db.delete(busStopTimes).where(inArray(busStopTimes.gtfsVersionId, toDelete))
  await db.delete(busTrips).where(inArray(busTrips.gtfsVersionId, toDelete))
  await db.delete(busRoutes).where(inArray(busRoutes.gtfsVersionId, toDelete))
  await db.delete(busStops).where(inArray(busStops.gtfsVersionId, toDelete))
  await db.delete(gtfsCalendarDates).where(inArray(gtfsCalendarDates.gtfsVersionId, toDelete))
  await db.delete(gtfsCalendar).where(inArray(gtfsCalendar.gtfsVersionId, toDelete))
  await db.delete(gtfsImportJobs).where(
    and(
      inArray(gtfsImportJobs.gtfsVersionId, toDelete),
      notInArray(gtfsImportJobs.status, ['running'])
    )
  )
  await db.delete(gtfsVersions).where(inArray(gtfsVersions.id, toDelete))

  console.log(`✓ Cleaned up ${toDelete.length} old version(s)`)
}

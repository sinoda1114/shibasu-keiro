import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../lib/db/client'
import { gtfsImportJobs, gtfsVersions } from '../lib/db/schema'

type GtfsVersion = typeof gtfsVersions.$inferSelect
type ImportJob = typeof gtfsImportJobs.$inferSelect

export interface ImportStatus {
  activeVersion: GtfsVersion | undefined
  versions: GtfsVersion[]
  jobs: ImportJob[]
}

/** 事業者ごとの GTFS の版と取込ジョブを、新しい順に返す（削除した管理画面の代わり） */
export async function getImportStatus(providerId: string, limit: number): Promise<ImportStatus> {
  const db = getDb()
  const versions = await db.select().from(gtfsVersions)
    .where(eq(gtfsVersions.providerId, providerId))
    .orderBy(desc(gtfsVersions.createdAt))
    .limit(limit)
  const [activeVersion] = await db.select().from(gtfsVersions)
    .where(and(eq(gtfsVersions.providerId, providerId), eq(gtfsVersions.status, 'active')))
    .limit(1)
  const jobs = await db.select().from(gtfsImportJobs)
    .where(eq(gtfsImportJobs.providerId, providerId))
    .orderBy(desc(gtfsImportJobs.createdAt))
    .limit(limit)
  return { activeVersion, versions, jobs }
}

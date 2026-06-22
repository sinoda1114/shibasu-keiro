export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { gtfsVersions } from '@/lib/db/schema'

export interface VersionWithCounts {
  id: string
  versionName: string
  status: string
  importedAt: string | null
  sourceHash: string | null
  createdAt: string
  stopCount: number
  stopTimeCount: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  const rows = await db
    .select({
      id: gtfsVersions.id,
      versionName: gtfsVersions.versionName,
      status: gtfsVersions.status,
      importedAt: gtfsVersions.importedAt,
      sourceHash: gtfsVersions.sourceHash,
      createdAt: gtfsVersions.createdAt,
      stopCount: sql<number>`(
        SELECT COUNT(*) FROM bus_stops
        WHERE bus_stops.gtfs_version_id = ${gtfsVersions.id}
      )`,
      stopTimeCount: sql<number>`(
        SELECT COUNT(*) FROM bus_stop_times
        WHERE bus_stop_times.gtfs_version_id = ${gtfsVersions.id}
      )`,
    })
    .from(gtfsVersions)
    .where(eq(gtfsVersions.providerId, providerId))
    .orderBy(sql`${gtfsVersions.createdAt} DESC`)

  const data: VersionWithCounts[] = rows.map((r) => ({
    id: r.id,
    versionName: r.versionName,
    status: r.status,
    importedAt: r.importedAt,
    sourceHash: r.sourceHash,
    createdAt: r.createdAt,
    stopCount: Number(r.stopCount),
    stopTimeCount: Number(r.stopTimeCount),
  }))

  return NextResponse.json({ success: true, data })
}

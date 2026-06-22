import { NextRequest, NextResponse } from 'next/server'
import { and, eq, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { busStops, gtfsVersions } from '@/lib/db/schema'

export interface StopSearchResult {
  stopId: string
  stopName: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!q || q.length < 1) {
    return NextResponse.json({ success: true, data: [] })
  }

  // active バージョンの bus_stops からプレフィックス検索
  const rows = await db
    .select({ stopId: busStops.stopId, stopName: busStops.stopName })
    .from(busStops)
    .innerJoin(gtfsVersions, and(
      eq(busStops.gtfsVersionId, gtfsVersions.id),
      eq(gtfsVersions.status, 'active')
    ))
    .where(
      and(
        eq(busStops.providerId, providerId),
        like(busStops.stopName, `${q}%`)
      )
    )
    .groupBy(busStops.stopName, busStops.stopId)
    .orderBy(sql`length(${busStops.stopName})`, busStops.stopName)
    .limit(20)

  const data: StopSearchResult[] = rows.map((r) => ({
    stopId: r.stopId,
    stopName: r.stopName,
  }))

  return NextResponse.json({ success: true, data })
}

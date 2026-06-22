import { NextRequest, NextResponse } from 'next/server'
import { and, eq, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { busStops, gtfsVersions } from '@/lib/db/schema'

export interface StopSearchResult {
  stopName: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!q || q.length < 1) {
    return NextResponse.json({ success: true, data: [] })
  }

  // active バージョンの bus_stops からプレフィックス検索（同名停留所を名前でまとめる）
  const rows = await db
    .select({ stopName: busStops.stopName })
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
    .groupBy(busStops.stopName)
    .orderBy(sql`length(${busStops.stopName})`, busStops.stopName)
    .limit(20)

  const data: StopSearchResult[] = rows.map((r) => ({
    stopName: r.stopName,
  }))

  return NextResponse.json({ success: true, data })
}

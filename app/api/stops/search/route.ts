export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, like, sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { busStops, gtfsVersions } from '@/lib/db/schema'
import { getAreaConfig } from '@/lib/providers/providers'

export interface StopSearchResult {
  stopName: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const areaId = searchParams.get('area') ?? searchParams.get('provider') ?? 'nagoya'

  if (!q || q.length < 1) {
    return NextResponse.json({ success: true, data: [] })
  }

  const area = getAreaConfig(areaId)
  // getAreaConfig は未知IDをデフォルト（名古屋）にフォールバックするため、
  // area.providerIds は常に非空。
  const providerIds = area.providerIds

  const rows = await db
    .select({ stopName: busStops.stopName })
    .from(busStops)
    .innerJoin(gtfsVersions, and(
      eq(busStops.gtfsVersionId, gtfsVersions.id),
      eq(gtfsVersions.status, 'active')
    ))
    .where(
      and(
        inArray(busStops.providerId, providerIds),
        like(busStops.stopName, `%${q}%`)
      )
    )
    .groupBy(busStops.stopName)
    .orderBy(
      sql`CASE WHEN ${busStops.stopName} LIKE ${q + '%'} THEN 0 ELSE 1 END`,
      sql`length(${busStops.stopName})`,
      busStops.stopName
    )
    .limit(20)

  const data: StopSearchResult[] = rows.map((r) => ({
    stopName: r.stopName,
  }))

  return NextResponse.json({ success: true, data })
}

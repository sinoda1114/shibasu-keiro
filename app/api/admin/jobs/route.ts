export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { gtfsImportJobs } from '@/lib/db/schema'

export interface ImportJob {
  id: string
  status: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  sourceUrl: string
  sourceHash: string | null
  createdAt: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'
  const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 100)

  const rows = await db
    .select()
    .from(gtfsImportJobs)
    .where(eq(gtfsImportJobs.providerId, providerId))
    .orderBy(desc(gtfsImportJobs.createdAt))
    .limit(limit)

  const data: ImportJob[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    errorMessage: r.errorMessage,
    sourceUrl: r.sourceUrl,
    sourceHash: r.sourceHash,
    createdAt: r.createdAt,
  }))

  return NextResponse.json({ success: true, data })
}

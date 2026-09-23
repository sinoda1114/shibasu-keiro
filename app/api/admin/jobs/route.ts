export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/lib/db/client'
import { gtfsImportJobs } from '@/lib/db/schema'
import { redactUrl } from '@/lib/redact-url'

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

  const rows = await getDb()
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
    // 保存済みの行に API キー入り URL が残っているため、読み出し側で必ず伏せる
    sourceUrl: redactUrl(r.sourceUrl),
    sourceHash: r.sourceHash,
    createdAt: r.createdAt,
  }))

  return NextResponse.json({ success: true, data })
}

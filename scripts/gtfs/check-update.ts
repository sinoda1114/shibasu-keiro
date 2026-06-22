import { desc, eq } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { gtfsVersions } from '../../lib/db/schema'

export interface UpdateCheckResult {
  hasUpdate: boolean
  etag: string | null
  lastModified: string | null
  sourceHash: string
}

/**
 * HTTP HEAD で ETag / Last-Modified を取得し、前回取込済みと比較する。
 * sourceHash は "etag:<value>" または "lm:<value>" の形式で保存する。
 */
export async function checkUpdate(url: string, providerId: string): Promise<UpdateCheckResult> {
  const res = await fetch(url, { method: 'HEAD' })
  if (!res.ok) throw new Error(`HEAD request failed: ${res.status} ${res.statusText}`)

  const etag = res.headers.get('etag')
  const lastModified = res.headers.get('last-modified')

  const newHash = etag ? `etag:${etag}` : lastModified ? `lm:${lastModified}` : `ts:${Date.now()}`

  const latest = await db
    .select({ sourceHash: gtfsVersions.sourceHash })
    .from(gtfsVersions)
    .where(eq(gtfsVersions.providerId, providerId))
    .orderBy(desc(gtfsVersions.createdAt))
    .limit(1)

  const prevHash = latest[0]?.sourceHash ?? null
  const hasUpdate = prevHash !== newHash

  return { hasUpdate, etag, lastModified, sourceHash: newHash }
}

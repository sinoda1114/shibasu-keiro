import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { gtfsVersions } from '../../lib/db/schema'
import { isOdptFilesUrl, resolveOdptUrl } from './utils'

export interface UpdateCheckResult {
  hasUpdate: boolean
  etag: string | null
  lastModified: string | null
  sourceHash: string
  resolvedUrl?: string
}

/**
 * HTTP HEAD で ETag / Last-Modified を取得し、前回取込済みと比較する。
 * sourceHash は "etag:<value>" または "lm:<value>" の形式で保存する。
 *
 * ODPT URL の場合は GET + redirect:manual で最新 date を探し、
 * Azure Blob URL に対して HEAD を行う。
 * sourceHash には "date:<date>:etag:<value>" の形式でdateを含める（月次更新を検出するため）。
 */
export async function checkUpdate(url: string, providerId: string): Promise<UpdateCheckResult> {
  let headUrl = url
  let datePrefix = ''
  let resolvedUrl: string | undefined

  if (isOdptFilesUrl(url)) {
    const resolved = await resolveOdptUrl(url)
    if (!resolved) {
      throw new Error('ODPT: 利用可能なGTFSデータが見つかりませんでした（過去6ヶ月を確認）')
    }
    headUrl = resolved.blobUrl
    datePrefix = `date:${resolved.date}:`
    resolvedUrl = resolved.blobUrl
    console.log(`ODPT resolved: date=${resolved.date}`)
  }

  const res = await fetch(headUrl, { method: 'HEAD' })
  if (!res.ok) throw new Error(`HEAD request failed: ${res.status} ${res.statusText}`)

  const etag = res.headers.get('etag')
  const lastModified = res.headers.get('last-modified')

  const newHash =
    datePrefix +
    (etag ? `etag:${etag}` : lastModified ? `lm:${lastModified}` : `ts:${Date.now()}`)

  // staging は失敗残骸の可能性があるため除外し、active/archived のみを比較対象とする
  const latest = await db
    .select({ sourceHash: gtfsVersions.sourceHash })
    .from(gtfsVersions)
    .where(
      and(
        eq(gtfsVersions.providerId, providerId),
        inArray(gtfsVersions.status, ['active', 'archived'])
      )
    )
    .orderBy(desc(gtfsVersions.createdAt))
    .limit(1)

  const prevHash = latest[0]?.sourceHash ?? null
  const hasUpdate = prevHash !== newHash

  return { hasUpdate, etag, lastModified, sourceHash: newHash, resolvedUrl }
}

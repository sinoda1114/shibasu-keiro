import { and, eq, ne } from 'drizzle-orm'
import { db } from '../../lib/db/client'
import { gtfsVersions } from '../../lib/db/schema'

/**
 * staging バージョンを active に昇格し、旧 active を archived に変更する。
 * 返り値: 昇格した versionId
 */
export async function activateVersion(versionId: string, providerId: string): Promise<void> {
  // 旧 active を archived に変更
  await db
    .update(gtfsVersions)
    .set({ status: 'archived' })
    .where(
      and(
        eq(gtfsVersions.providerId, providerId),
        eq(gtfsVersions.status, 'active')
      )
    )

  // staging → active に昇格
  await db
    .update(gtfsVersions)
    .set({ status: 'active', importedAt: new Date().toISOString() })
    .where(
      and(
        eq(gtfsVersions.id, versionId),
        ne(gtfsVersions.status, 'active') // 冪等性: すでに active なら何もしない
      )
    )

  console.log(`✓ Version ${versionId} activated`)
}

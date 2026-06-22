import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { desc, eq } from 'drizzle-orm'
import { downloadAndExtract } from './download'
import { importGtfs } from './import'
import { validateImport } from './validate'
import { db } from '../../lib/db/client'
import { gtfsVersions } from '../../lib/db/schema'

async function main(): Promise<void> {
  const gtfsUrl = process.env.NAGOYA_GTFS_URL
  if (!gtfsUrl) throw new Error('NAGOYA_GTFS_URL is not set')

  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is not set')

  const tmpDir = join(process.cwd(), '.data', 'gtfs-tmp')
  const versionName = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  try {
    // ダウンロード・解凍
    await downloadAndExtract(gtfsUrl, tmpDir)

    // 取込
    await importGtfs(tmpDir, versionName)

    // 最新versionIdを取得して検証
    const latest = await db
      .select()
      .from(gtfsVersions)
      .where(eq(gtfsVersions.providerId, 'nagoya_city_bus'))
      .orderBy(desc(gtfsVersions.createdAt))
      .limit(1)

    if (latest[0]) {
      await validateImport(latest[0].id)
    }
  } finally {
    // 作業ディレクトリ削除
    try {
      rmSync(tmpDir, { recursive: true })
    } catch {
      // 削除失敗は無視
    }
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})

import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { checkUpdate } from './check-update'
import { downloadAndExtract } from './download'
import { importGtfs } from './import'
import { validateImport } from './validate'
import { activateVersion } from './activate'
import { cleanupOldVersions } from './cleanup'

const PROVIDER_ID = 'nagoya_city_bus'

async function main(): Promise<void> {
  const gtfsUrl = process.env.NAGOYA_GTFS_URL
  if (!gtfsUrl) throw new Error('NAGOYA_GTFS_URL is not set')
  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is not set')

  // 1. 更新チェック（ETag / Last-Modified）
  console.log('Checking for GTFS updates...')
  const update = await checkUpdate(gtfsUrl, PROVIDER_ID)

  if (!update.hasUpdate) {
    console.log('No update detected. Skipping import.')
    return
  }

  console.log(`Update detected (sourceHash: ${update.sourceHash}). Starting import...`)

  const tmpDir = join(process.cwd(), '.data', 'gtfs-tmp')
  const versionName = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  try {
    // 2. ダウンロード・解凍
    await downloadAndExtract(gtfsUrl, tmpDir)

    // 3. staging として取込
    const versionId = await importGtfs(tmpDir, versionName, update.sourceHash)

    // 4. 検証
    const valid = await validateImport(versionId)
    if (!valid) {
      throw new Error(`Validation failed for version ${versionId}`)
    }

    // 5. staging → active 昇格（旧 active は自動 archived）
    await activateVersion(versionId, PROVIDER_ID)

    // 6. 古いバージョンのクリーンアップ
    await cleanupOldVersions(PROVIDER_ID)

    console.log('\n🎉 GTFS update completed successfully!')
  } finally {
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

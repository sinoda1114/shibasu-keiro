import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { checkUpdate } from './check-update'
import { downloadAndExtract } from './download'
import { importGtfs, type GtfsProviderConfig } from './import'
import { validateImport } from './validate'
import { activateVersion } from './activate'
import { cleanupOldVersions } from './cleanup'

const PROVIDER_CONFIGS: Record<string, { gtfsUrlEnv: string; displayName: string; areaName: string }> = {
  nagoya_city_bus: {
    gtfsUrlEnv: 'NAGOYA_GTFS_URL',
    displayName: '名古屋市バス',
    areaName: '名古屋市',
  },
  yokohama_city_bus: {
    gtfsUrlEnv: 'YOKOHAMA_GTFS_URL',
    displayName: '横浜市バス',
    areaName: '横浜市',
  },
}

async function main(): Promise<void> {
  const providerId = process.env.GTFS_PROVIDER ?? 'nagoya_city_bus'
  const providerMeta = PROVIDER_CONFIGS[providerId]
  if (!providerMeta) {
    throw new Error(`Unknown GTFS_PROVIDER: ${providerId}. Available: ${Object.keys(PROVIDER_CONFIGS).join(', ')}`)
  }

  const gtfsUrl = process.env[providerMeta.gtfsUrlEnv]
  if (!gtfsUrl) throw new Error(`${providerMeta.gtfsUrlEnv} is not set`)
  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is not set')

  const config: GtfsProviderConfig = {
    providerId,
    displayName: providerMeta.displayName,
    areaName: providerMeta.areaName,
    sourceUrl: gtfsUrl,
  }

  // 1. 更新チェック（ETag / Last-Modified）
  console.log(`Checking for GTFS updates (${providerId})...`)
  const update = await checkUpdate(gtfsUrl, providerId)

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
    const versionId = await importGtfs(tmpDir, versionName, config, update.sourceHash)

    // 4. 検証
    const valid = await validateImport(versionId)
    if (!valid) {
      throw new Error(`Validation failed for version ${versionId}`)
    }

    // 5. staging → active 昇格（旧 active は自動 archived）
    await activateVersion(versionId, providerId)

    // 6. 古いバージョンのクリーンアップ
    await cleanupOldVersions(providerId)

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

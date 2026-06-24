import { checkOdptUpdate, importOdpt } from './import'
import { validateImport } from '../gtfs/validate'
import { activateVersion } from '../gtfs/activate'
import { cleanupOldVersions } from '../gtfs/cleanup'

const PROVIDER_ID = 'sotetsu_bus'

async function main(): Promise<void> {
  // ODPT_CONSUMER_KEY が未設定の場合 YOKOHAMA_GTFS_URL から抽出するフォールバック
  let consumerKey = process.env.ODPT_CONSUMER_KEY
  if (!consumerKey) {
    const yokohamaUrl = process.env.YOKOHAMA_GTFS_URL
    if (yokohamaUrl) {
      try {
        consumerKey = new URL(yokohamaUrl).searchParams.get('acl:consumerKey') ?? undefined
      } catch {
        // URL parse error は無視
      }
    }
  }
  if (!consumerKey) throw new Error('ODPT_CONSUMER_KEY が設定されていません（または YOKOHAMA_GTFS_URL からキーを取得できませんでした）')
  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is not set')

  // 1. 更新チェック（dc:date で差分検出）
  console.log(`Checking for ODPT updates (${PROVIDER_ID})...`)
  const { hasUpdate, sourceHash } = await checkOdptUpdate(consumerKey)

  if (!hasUpdate) {
    console.log('No update detected. Skipping import.')
    return
  }

  console.log(`Update detected (sourceHash: ${sourceHash}). Starting import...`)

  // 2. ODPT API からフェッチしてDB取込（staging）
  const versionId = await importOdpt(consumerKey, sourceHash)

  // 3. 検証
  const valid = await validateImport(versionId)
  if (!valid) {
    throw new Error(`Validation failed for version ${versionId}`)
  }

  // 4. staging → active 昇格
  await activateVersion(versionId, PROVIDER_ID)

  // 5. 古いバージョンのクリーンアップ
  await cleanupOldVersions(PROVIDER_ID)

  console.log('\n🎉 Sotetsu Bus ODPT import completed successfully!')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})

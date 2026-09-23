// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/client'
import { gtfsVersions, providers } from '@/lib/db/schema'
import { getActiveVersionId } from '../service-resolver'

const NOW = '2026-01-01T00:00:00Z'
let dir: string

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'shibasu-resolver-'))
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'test.db')}`
  await migrate(getDb(), { migrationsFolder: path.resolve(__dirname, '../../../drizzle/migrations') })
  await getDb().insert(providers).values([
    { id: 'sotetsu_bus', name: 'sotetsu', displayName: '相鉄バス', areaName: '横浜市', createdAt: NOW, updatedAt: NOW },
  ])
})

afterAll(() => {
  getDb().$client.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('getActiveVersionId', () => {
  it('版が無い結果はキャッシュしない（インポートから復旧したら次の呼び出しで版を返す）', async () => {
    expect(await getActiveVersionId('sotetsu_bus')).toBeNull()

    await getDb().insert(gtfsVersions).values(
      { id: 'st-v1', providerId: 'sotetsu_bus', versionName: 'v1', sourceUrl: 'x', status: 'active', createdAt: NOW }
    )

    expect(await getActiveVersionId('sotetsu_bus')).toBe('st-v1')
  })
})

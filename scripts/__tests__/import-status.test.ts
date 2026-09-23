// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/client'
import { gtfsImportJobs, gtfsVersions, providers } from '@/lib/db/schema'
import { getImportStatus } from '../import-status'

let dir: string

function at(day: number) {
  return `2026-09-${String(day).padStart(2, '0')}T00:00:00Z`
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'shibasu-import-status-'))
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'test.db')}`
  const db = getDb()
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle/migrations') })
  await db.insert(providers).values([
    { id: 'yokohama_city_bus', name: 'yokohama', displayName: '横浜市営バス', areaName: '横浜市', createdAt: at(1), updatedAt: at(1) },
    { id: 'sotetsu_bus', name: 'sotetsu', displayName: '相鉄バス', areaName: '横浜市', createdAt: at(1), updatedAt: at(1) },
  ])
  // 挿入順と日時の順をわざと食い違わせる（並べ替えが無いと古い行が先に出る）
  await db.insert(gtfsVersions).values([
    { id: 'yc-1', providerId: 'yokohama_city_bus', versionName: 'v1', sourceUrl: 'x', status: 'archived', createdAt: at(1) },
    { id: 'st-1', providerId: 'sotetsu_bus', versionName: 's1', sourceUrl: 'x', status: 'active', createdAt: at(20) },
    { id: 'yc-3', providerId: 'yokohama_city_bus', versionName: 'v3', sourceUrl: 'x', status: 'active', createdAt: at(15) },
    { id: 'yc-2', providerId: 'yokohama_city_bus', versionName: 'v2', sourceUrl: 'x', status: 'archived', createdAt: at(8) },
  ])
  await db.insert(gtfsImportJobs).values(
    Array.from({ length: 8 }, (_, i) => ({
      id: `yc-job-${i}`, providerId: 'yokohama_city_bus', status: i === 7 ? 'failed' : 'completed',
      errorMessage: i === 7 ? 'ODPT が認証エラー（HTTP 401）を返しました' : null, sourceUrl: 'x', createdAt: at(i + 1),
    })).concat([{ id: 'st-job', providerId: 'sotetsu_bus', status: 'completed', errorMessage: null, sourceUrl: 'x', createdAt: at(22) }]),
  )
})

afterAll(() => {
  getDb().$client.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('getImportStatus', () => {
  it('指定した事業者の版と取込ジョブだけを、新しい順に返すこと', async () => {
    const status = await getImportStatus('yokohama_city_bus', 5)
    expect(status.versions.map((v) => v.versionName)).toEqual(['v3', 'v2', 'v1'])
    expect(status.jobs.map((j) => j.id)).toEqual(['yc-job-7', 'yc-job-6', 'yc-job-5', 'yc-job-4', 'yc-job-3'])
  })

  it('件数の上限を超える古いジョブがあっても、最新の失敗が必ず入ること', async () => {
    const { jobs } = await getImportStatus('yokohama_city_bus', 1)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ status: 'failed', errorMessage: expect.stringContaining('HTTP 401') })
  })

  it('有効な版（active）を返すこと', async () => {
    expect((await getImportStatus('yokohama_city_bus', 5)).activeVersion?.versionName).toBe('v3')
    expect((await getImportStatus('nagoya_city_bus', 5)).activeVersion).toBeUndefined()
  })
})

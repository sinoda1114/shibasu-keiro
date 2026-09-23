// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({})) }))
vi.mock('@libsql/client', () => ({ createClient }))
vi.mock('drizzle-orm/libsql', () => ({ drizzle: vi.fn((client: unknown) => ({ client })) }))

// 新しいルートを足したときに検査から漏れないよう、一覧を手で持たず集める
const ROUTES = import.meta.glob('/app/api/**/route.ts')

beforeEach(() => {
  vi.resetModules()
  createClient.mockClear()
})

describe('lib/db/client', () => {
  it('ルートを import しただけでは DB に接続しない（next build のページデータ収集と同じ条件）', async () => {
    const loaders = Object.values(ROUTES)
    expect(loaders.length).toBeGreaterThanOrEqual(7)
    for (const load of loaders) await load()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('getDb() を最初に呼んだときに 1 回だけ接続し、以後は同じインスタンスを返す', async () => {
    const { getDb } = await import('@/lib/db/client')
    const first = getDb()
    expect(getDb()).toBe(first)
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('接続先は getDb() を呼んだ時点の環境変数で決まる', async () => {
    const saved = process.env.TURSO_DATABASE_URL
    try {
      process.env.TURSO_DATABASE_URL = 'file:before-import.db'
      const { getDb } = await import('@/lib/db/client')
      process.env.TURSO_DATABASE_URL = 'file:set-after-import.db'
      getDb()
      expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:set-after-import.db' }))
    } finally {
      if (saved === undefined) delete process.env.TURSO_DATABASE_URL
      else process.env.TURSO_DATABASE_URL = saved
    }
  })
})

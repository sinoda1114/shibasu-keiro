import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBusstopPoles, fetchLatestDcDate } from '../fetch'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function respond(status: number) {
  vi.mocked(fetch).mockResolvedValue({ ok: status < 400, status, statusText: 'x', json: async () => [] } as unknown as Response)
}

describe('ODPT API の取得', () => {
  it.each([401, 403])('HTTP %i なら、キーが原因と分かる文言で止まり、キーの値は含めない', async (status) => {
    respond(status)
    for (const call of [fetchBusstopPoles, fetchLatestDcDate]) {
      const error = await call('SECRET_TEST_TOKEN').catch((e: Error) => e)
      expect(String(error)).toMatch(new RegExp(`認証エラー（HTTP ${status}）`))
      expect(String(error)).not.toMatch(/SECRET_TEST_TOKEN/)
    }
  })

  it('CI（ODPT_CONSUMER_KEY なし）では、キーの取り出し元の GitHub の Secret YOKOHAMA_GTFS_URL を案内する', async () => {
    vi.stubEnv('GITHUB_ACTIONS', 'true')
    vi.stubEnv('ODPT_CONSUMER_KEY', '')
    respond(403)
    await expect(fetchBusstopPoles('SECRET_TEST_TOKEN')).rejects.toThrow(/GitHub の Secret YOKOHAMA_GTFS_URL/)
  })

  it('手元で ODPT_CONSUMER_KEY を使っているときは .env.local の ODPT_CONSUMER_KEY を案内する', async () => {
    vi.stubEnv('GITHUB_ACTIONS', '')
    vi.stubEnv('ODPT_CONSUMER_KEY', 'SECRET_TEST_TOKEN')
    respond(403)
    await expect(fetchBusstopPoles('SECRET_TEST_TOKEN')).rejects.toThrow(/\.env\.local の ODPT_CONSUMER_KEY/)
  })

  it('認証以外のエラー（HTTP 500）は、これまでどおり状態コードを示して止まる', async () => {
    respond(500)
    await expect(fetchBusstopPoles('SECRET_TEST_TOKEN')).rejects.toThrow(/failed: 500/)
  })
})

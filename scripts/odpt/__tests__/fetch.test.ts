import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBusstopPoles, fetchLatestDcDate } from '../fetch'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function respond(status: number) {
  vi.mocked(fetch).mockResolvedValue({ ok: status < 400, status, statusText: 'x', json: async () => [] } as unknown as Response)
}

describe('ODPT API の取得', () => {
  it.each([401, 403])('HTTP %i なら、キーが原因と分かる文言で止まり、キーの値は含めない', async (status) => {
    respond(status)
    for (const run of [fetchBusstopPoles('SECRET_TEST_TOKEN'), fetchLatestDcDate('SECRET_TEST_TOKEN')]) {
      await expect(run).rejects.toThrow(new RegExp(`認証エラー（HTTP ${status}）[\\s\\S]*ODPT_CONSUMER_KEY`))
      await expect(run).rejects.not.toThrow(/SECRET_TEST_TOKEN/)
    }
  })

  it('認証以外のエラー（HTTP 500）は、これまでどおり状態コードを示して止まる', async () => {
    respond(500)
    await expect(fetchBusstopPoles('SECRET_TEST_TOKEN')).rejects.toThrow(/failed: 500/)
  })
})

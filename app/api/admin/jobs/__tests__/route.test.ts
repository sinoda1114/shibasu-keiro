// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

const leakedRow = {
  id: 'job-1',
  providerId: 'yokohama_city_bus',
  gtfsVersionId: 'ver-1',
  status: 'succeeded',
  startedAt: '2026-09-01T00:00:00.000Z',
  finishedAt: '2026-09-01T00:10:00.000Z',
  errorMessage: null,
  sourceUrl:
    'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=TESTKEY',
  sourceHash: 'etag:abc',
  createdAt: '2026-09-01T00:00:00.000Z',
}

vi.mock('@/lib/db/client', () => {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: async () => [leakedRow],
  }
  return { db: chain }
})

describe('GET /api/admin/jobs', () => {
  it('sourceUrl の問い合わせ文字列（API キー）を応答に含めない', async () => {
    const { GET } = await import('../route')
    const req = new NextRequest('http://localhost/api/admin/jobs?provider=yokohama_city_bus')

    const res = await GET(req)
    const text = await res.text()

    expect(text).not.toContain('consumerKey')
    expect(text).not.toContain('TESTKEY')
    const body = JSON.parse(text)
    expect(body.data[0].sourceUrl).toBe(
      'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip'
    )
  })
})

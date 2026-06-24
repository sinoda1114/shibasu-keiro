import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// DB モックをホイスト前に定義する
const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('../../../lib/db/client', () => ({
  db: mockDb,
}))

import { isOdptFilesUrl, resolveOdptUrl, checkUpdate } from '../check-update'

function setupDbChain(result: { sourceHash: string }[] = []) {
  mockDb.select.mockReturnValue(mockDb)
  mockDb.from.mockReturnValue(mockDb)
  mockDb.where.mockReturnValue(mockDb)
  mockDb.orderBy.mockReturnValue(mockDb)
  mockDb.limit.mockResolvedValue(result)
}

describe('isOdptFilesUrl', () => {
  it('ODPT Files API の URL を正しく判定すること', () => {
    expect(
      isOdptFilesUrl(
        'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=xxx'
      )
    ).toBe(true)
  })

  it('ODPT 以外の URL を false と判定すること', () => {
    expect(isOdptFilesUrl('https://example.com/gtfs.zip')).toBe(false)
  })

  it('api.odpt.org でも /api/v4/files/ を含まなければ false と判定すること', () => {
    expect(isOdptFilesUrl('https://api.odpt.org/api/v4/something/else')).toBe(false)
  })
})

describe('resolveOdptUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('302 レスポンスの Location ヘッダーから blobUrl と date を返すこと', async () => {
    const mockFetch = vi.mocked(fetch)
    const mockHeaders = new Headers({ location: 'https://blob.example.com/Bus-20260601.zip?sas=xxx' })
    mockFetch.mockResolvedValueOnce({
      status: 302,
      headers: mockHeaders,
    } as unknown as Response)

    const result = await resolveOdptUrl(
      'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=mytoken'
    )

    expect(result).not.toBeNull()
    expect(result?.blobUrl).toBe('https://blob.example.com/Bus-20260601.zip?sas=xxx')
    // date は呼び出し時の月に依存するので、形式だけ確認
    expect(result?.date).toMatch(/^\d{8}$/)
  })

  it('6ヶ月分すべて 302 でなければ null を返すこと', async () => {
    const mockFetch = vi.mocked(fetch)
    // 6回 304 を返す
    mockFetch.mockResolvedValue({
      status: 404,
      headers: new Headers(),
    } as unknown as Response)

    const result = await resolveOdptUrl(
      'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=mytoken'
    )

    expect(result).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(6)
  })

  it('fetch に redirect: manual が渡されること', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 404,
      headers: new Headers(),
    } as unknown as Response)

    await resolveOdptUrl(
      'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=mytoken'
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.odpt.org'),
      { redirect: 'manual' }
    )
  })
})

describe('checkUpdate', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('通常URL（非ODPT）', () => {
    it('ETag が変わっていれば hasUpdate: true を返すこと', async () => {
      setupDbChain([{ sourceHash: 'etag:"old-etag"' }])

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ etag: '"new-etag"' }),
      } as unknown as Response)

      const result = await checkUpdate('https://example.com/gtfs.zip', 'test_provider')

      expect(result.hasUpdate).toBe(true)
      expect(result.sourceHash).toBe('etag:"new-etag"')
      expect(result.etag).toBe('"new-etag"')
      expect(result.resolvedUrl).toBeUndefined()
    })

    it('ETag が同じなら hasUpdate: false を返すこと', async () => {
      setupDbChain([{ sourceHash: 'etag:"same-etag"' }])

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ etag: '"same-etag"' }),
      } as unknown as Response)

      const result = await checkUpdate('https://example.com/gtfs.zip', 'test_provider')

      expect(result.hasUpdate).toBe(false)
    })

    it('DB に前回ハッシュがなければ hasUpdate: true を返すこと', async () => {
      setupDbChain([]) // 空 = 初回インポート

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ etag: '"first-etag"' }),
      } as unknown as Response)

      const result = await checkUpdate('https://example.com/gtfs.zip', 'test_provider')

      expect(result.hasUpdate).toBe(true)
    })

    it('HEAD リクエストが失敗したらエラーをスローすること', async () => {
      setupDbChain([])

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as unknown as Response)

      await expect(
        checkUpdate('https://example.com/gtfs.zip', 'test_provider')
      ).rejects.toThrow('HEAD request failed: 404 Not Found')
    })

    it('ETag も Last-Modified もなければ sourceHash が ts: プレフィックスになること', async () => {
      setupDbChain([])

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
      } as unknown as Response)

      const result = await checkUpdate('https://example.com/gtfs.zip', 'test_provider')

      expect(result.sourceHash).toMatch(/^ts:\d+$/)
    })
  })

  describe('ODPT URL', () => {
    it('resolvedUrl が返り値に含まれること', async () => {
      setupDbChain([])

      const mockFetch = vi.mocked(fetch)
      // 1回目: ODPT URL → 302
      mockFetch.mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          location: 'https://blob.example.com/Bus-20260601.zip?sas=xxx',
        }),
      } as unknown as Response)
      // 2回目: Azure Blob HEAD
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ etag: '"blob-etag"' }),
      } as unknown as Response)

      const result = await checkUpdate(
        'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=tok',
        'yokohama_city_bus'
      )

      expect(result.resolvedUrl).toBe('https://blob.example.com/Bus-20260601.zip?sas=xxx')
      expect(result.sourceHash).toMatch(/^date:\d{8}:etag:/)
      expect(result.hasUpdate).toBe(true)
    })

    it('利用可能な date が見つからなければエラーをスローすること', async () => {
      setupDbChain([])

      vi.mocked(fetch).mockResolvedValue({
        status: 404,
        headers: new Headers(),
      } as unknown as Response)

      await expect(
        checkUpdate(
          'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=tok',
          'yokohama_city_bus'
        )
      ).rejects.toThrow('ODPT: 利用可能なGTFSデータが見つかりませんでした')
    })
  })
})

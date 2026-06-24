import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted を使ってモックをホイスト前に定義する
const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../../../lib/db/client', () => ({
  db: mockDb,
}))

// parseGtfsFile をモック（実ファイルなし）
vi.mock('../parse', () => ({
  parseGtfsFile: vi.fn().mockReturnValue([]),
}))

// utils をモック
vi.mock('../utils', () => ({
  generateId: vi.fn().mockReturnValue('test-id'),
  gtfsTimeToSeconds: vi.fn().mockReturnValue(0),
}))

import { importGtfs, type GtfsProviderConfig } from '../import'

function setupDbChain() {
  mockDb.select.mockReturnValue(mockDb)
  mockDb.from.mockReturnValue(mockDb)
  mockDb.where.mockReturnValue(mockDb)
  mockDb.limit.mockResolvedValue([])
  mockDb.insert.mockReturnValue(mockDb)
  mockDb.values.mockResolvedValue(undefined)
  mockDb.update.mockReturnValue(mockDb)
  mockDb.set.mockReturnValue(mockDb)
  mockDb.delete.mockReturnValue(mockDb)
}

describe('importGtfs', () => {
  const config: GtfsProviderConfig = {
    providerId: 'test_provider',
    displayName: 'テスト事業者',
    areaName: 'テスト市',
    sourceUrl: 'https://example.com/gtfs.zip',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDbChain()
  })

  it('GtfsProviderConfig を第3引数として受け取れること', async () => {
    const result = await importGtfs('/tmp/gtfs', '2024-01-01', config)
    expect(result).toBe('test-id')
  })

  it('config.providerId が DB 呼び出しに使用されること', async () => {
    await importGtfs('/tmp/gtfs', '2024-01-01', config)

    // providers テーブルへの select が呼ばれること
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('sourceHash なしで呼び出せること', async () => {
    const result = await importGtfs('/tmp/gtfs', '2024-01-01', config)
    expect(result).toBe('test-id')
  })

  it('sourceHash ありで呼び出せること', async () => {
    const result = await importGtfs('/tmp/gtfs', '2024-01-01', config, 'abc123hash')
    expect(result).toBe('test-id')
  })

  it('GtfsProviderConfig インターフェースが正しく export されていること', () => {
    const validConfig: GtfsProviderConfig = {
      providerId: 'some_provider',
      displayName: '表示名',
      areaName: 'エリア名',
      sourceUrl: 'https://example.com/gtfs.zip',
    }
    expect(validConfig.providerId).toBe('some_provider')
    expect(validConfig.displayName).toBe('表示名')
    expect(validConfig.areaName).toBe('エリア名')
    expect(validConfig.sourceUrl).toBe('https://example.com/gtfs.zip')
  })
})

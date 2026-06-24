import { describe, it, expect, beforeEach, vi } from 'vitest'
import { addFavorite, getFavorites } from '../local-storage'

// localStorageをモック
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v },
  removeItem: (k: string) => { delete storage[k] },
})

describe('addFavorite', () => {
  beforeEach(() => { Object.keys(storage).forEach(k => delete storage[k]) })

  it('areaId と providerDisplayName を受け取れること', () => {
    const result = addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    expect(result.areaId).toBe('nagoya')
    expect(result.providerDisplayName).toBe('名古屋市バス')
  })

  it('横浜エリアの areaId が保存されること', () => {
    const result = addFavorite('横浜駅', '元町', 'yokohama', '横浜市営バス・相鉄バス')
    expect(result.areaId).toBe('yokohama')
    const stored = getFavorites()
    expect(stored[0].areaId).toBe('yokohama')
  })

  it('異なる areaId で同じ停留所名が別エントリとして保存されること', () => {
    addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    addFavorite('横浜駅', '元町', 'yokohama', '横浜市営バス・相鉄バス')
    const stored = getFavorites()
    expect(stored).toHaveLength(2)
    expect(stored.map(f => f.areaId)).toContain('nagoya')
    expect(stored.map(f => f.areaId)).toContain('yokohama')
  })

  it('返り値に id と createdAt が含まれること', () => {
    const result = addFavorite('金山', '栄', 'nagoya', '名古屋市バス')
    expect(result.id).toBeTruthy()
    expect(result.createdAt).toBeTruthy()
    expect(result.fromStopName).toBe('金山')
    expect(result.toStopName).toBe('栄')
  })

  it('同じ areaId で複数のルートを追加できること', () => {
    addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    addFavorite('金山', '栄', 'nagoya', '名古屋市バス')
    const stored = getFavorites()
    expect(stored).toHaveLength(2)
  })
})

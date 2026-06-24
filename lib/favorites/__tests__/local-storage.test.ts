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

  it('providerId を第3引数として受け取れること', () => {
    const result = addFavorite('栄', '名古屋駅', 'nagoya_city_bus')
    expect(result.providerId).toBe('nagoya_city_bus')
  })

  it('yokohama_city_bus の providerId が保存されること', () => {
    const result = addFavorite('横浜駅', '元町', 'yokohama_city_bus')
    expect(result.providerId).toBe('yokohama_city_bus')
    const stored = getFavorites()
    expect(stored[0].providerId).toBe('yokohama_city_bus')
  })

  it('異なる providerId で同じ停留所名が別エントリとして保存されること', () => {
    addFavorite('栄', '名古屋駅', 'nagoya_city_bus')
    addFavorite('栄', '名古屋駅', 'yokohama_city_bus')
    const stored = getFavorites()
    expect(stored).toHaveLength(2)
    expect(stored.map(f => f.providerId)).toContain('nagoya_city_bus')
    expect(stored.map(f => f.providerId)).toContain('yokohama_city_bus')
  })

  it('返り値に id と createdAt が含まれること', () => {
    const result = addFavorite('金山', '栄', 'nagoya_city_bus')
    expect(result.id).toBeTruthy()
    expect(result.createdAt).toBeTruthy()
    expect(result.fromStopName).toBe('金山')
    expect(result.toStopName).toBe('栄')
  })

  it('同じ providerId で複数のルートを追加できること', () => {
    addFavorite('栄', '名古屋駅', 'nagoya_city_bus')
    addFavorite('金山', '栄', 'nagoya_city_bus')
    const stored = getFavorites()
    expect(stored).toHaveLength(2)
  })
})

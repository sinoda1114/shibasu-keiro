import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { addFavorite, getFavorites, removeFavorite, reverseFavorite } from '../local-storage'

// localStorageをモック
const storage: Record<string, string> = {}
let failWrites = false
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    if (failWrites) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    storage[k] = v
  },
  removeItem: (k: string) => { delete storage[k] },
})

afterEach(() => { failWrites = false })

describe('addFavorite', () => {
  beforeEach(() => { Object.keys(storage).forEach(k => delete storage[k]) })

  it('areaId と providerDisplayName を受け取れること', () => {
    const result = addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    expect(result?.areaId).toBe('nagoya')
    expect(result?.providerDisplayName).toBe('名古屋市バス')
  })

  it('横浜エリアの areaId が保存されること', () => {
    const result = addFavorite('横浜駅', '元町', 'yokohama', '横浜市営バス・相鉄バス')
    expect(result?.areaId).toBe('yokohama')
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
    expect(result?.id).toBeTruthy()
    expect(result?.createdAt).toBeTruthy()
    expect(result?.fromStopName).toBe('金山')
    expect(result?.toStopName).toBe('栄')
  })

  it('同じ areaId で複数のルートを追加できること', () => {
    addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    addFavorite('金山', '栄', 'nagoya', '名古屋市バス')
    const stored = getFavorites()
    expect(stored).toHaveLength(2)
  })
})

describe('書き込みに失敗したとき', () => {
  beforeEach(() => { Object.keys(storage).forEach(k => delete storage[k]) })

  it('addFavorite は例外を投げずに null を返す', () => {
    failWrites = true
    expect(addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')).toBeNull()
    expect(getFavorites()).toEqual([])
  })

  it('removeFavorite は例外を投げずに false を返し、保存内容は変わらない', () => {
    const added = addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    failWrites = true
    expect(removeFavorite(added!.id)).toBe(false)
    expect(getFavorites()).toHaveLength(1)
  })

  it('reverseFavorite は例外を投げずに false を返し、保存内容は変わらない', () => {
    const added = addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    failWrites = true
    expect(reverseFavorite(added!.id)).toBe(false)
    expect(getFavorites()[0].fromStopName).toBe('栄')
  })

  it('成功したときは removeFavorite / reverseFavorite が true を返す', () => {
    const added = addFavorite('栄', '名古屋駅', 'nagoya', '名古屋市バス')
    expect(reverseFavorite(added!.id)).toBe(true)
    expect(removeFavorite(added!.id)).toBe(true)
    expect(getFavorites()).toEqual([])
  })
})

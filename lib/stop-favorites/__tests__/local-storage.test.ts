import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStopFavorites, toggleStopFavorite } from '../local-storage'

function failWrites() {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('toggleStopFavorite', () => {
  it('保存できたら true を返し、登録と解除が反映される', () => {
    expect(toggleStopFavorite('栄', 'nagoya')).toBe(true)
    expect(getStopFavorites()).toEqual([{ stopName: '栄', areaId: 'nagoya' }])
    expect(toggleStopFavorite('栄', 'nagoya')).toBe(true)
    expect(getStopFavorites()).toEqual([])
  })

  it('書き込みに失敗したら false を返し、登録状態を変えない', () => {
    failWrites()
    expect(toggleStopFavorite('栄', 'nagoya')).toBe(false)
    expect(getStopFavorites()).toEqual([])
  })

  it('解除の書き込みに失敗したら false を返し、登録済みのまま残す', () => {
    toggleStopFavorite('栄', 'nagoya')
    failWrites()
    expect(toggleStopFavorite('栄', 'nagoya')).toBe(false)
    expect(getStopFavorites()).toEqual([{ stopName: '栄', areaId: 'nagoya' }])
  })

  it('localStorage 自体が遮断されていても例外を投げず、保存できなかったと返す', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    expect(getStopFavorites()).toEqual([])
    expect(toggleStopFavorite('栄', 'nagoya')).toBe(false)
  })
})

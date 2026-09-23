import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSearchHistory, saveSearchHistory } from '../local-storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('saveSearchHistory', () => {
  it('保存できたら true を返し、最新の検索を先頭に入れる', () => {
    expect(saveSearchHistory('栄', '名古屋駅')).toBe(true)
    expect(saveSearchHistory('大曽根', '栄')).toBe(true)
    expect(getSearchHistory().map((h) => [h.from, h.to])).toEqual([['大曽根', '栄'], ['栄', '名古屋駅']])
  })

  it('書き込みに失敗したら false を返し、例外を投げない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    expect(saveSearchHistory('栄', '名古屋駅')).toBe(false)
    expect(getSearchHistory()).toEqual([])
  })

  it('localStorage 自体が遮断されていても例外を投げない', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    expect(getSearchHistory()).toEqual([])
    expect(saveSearchHistory('栄', '名古屋駅')).toBe(false)
  })
})

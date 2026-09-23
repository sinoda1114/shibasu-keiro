import { readLocalStorage, writeLocalStorage } from '@/lib/safe-storage'

const HISTORY_KEY = 'shibasu_keiro_search_history'
const MAX_HISTORY = 8

export interface SearchHistoryItem {
  from: string
  to: string
  searchedAt: string
}

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return []
  const raw = readLocalStorage(HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SearchHistoryItem[]
  } catch {
    return []
  }
}

/** 保存できたら true。遮断・容量超過なら false（履歴は残らない。例外は投げない） */
export function saveSearchHistory(from: string, to: string): boolean {
  if (typeof window === 'undefined') return false
  const history = getSearchHistory()
  const filtered = history.filter(h => !(h.from === from && h.to === to))
  const updated = [{ from, to, searchedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_HISTORY)
  return writeLocalStorage(HISTORY_KEY, JSON.stringify(updated))
}

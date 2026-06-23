const HISTORY_KEY = 'shibasu_keiro_search_history'
const MAX_HISTORY = 8

export interface SearchHistoryItem {
  from: string
  to: string
  searchedAt: string
}

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SearchHistoryItem[]
  } catch {
    return []
  }
}

export function saveSearchHistory(from: string, to: string): void {
  if (typeof window === 'undefined') return
  const history = getSearchHistory()
  const filtered = history.filter(h => !(h.from === from && h.to === to))
  const updated = [{ from, to, searchedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

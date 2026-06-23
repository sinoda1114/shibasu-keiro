const KEY = 'shibasu_keiro_stop_favorites'

export function getStopFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string')
  } catch {
    return []
  }
}

export function isStopFavorited(stopName: string): boolean {
  return getStopFavorites().includes(stopName)
}

export function addStopFavorite(stopName: string): void {
  const current = getStopFavorites()
  if (current.includes(stopName)) return
  try {
    localStorage.setItem(KEY, JSON.stringify([stopName, ...current]))
  } catch {
    // ストレージ容量超過等では状態を変えない
  }
}

export function removeStopFavorite(stopName: string): void {
  const current = getStopFavorites()
  try {
    localStorage.setItem(KEY, JSON.stringify(current.filter((s) => s !== stopName)))
  } catch {
    // ストレージ書き込み失敗時は無視
  }
}

export function toggleStopFavorite(stopName: string): boolean {
  if (isStopFavorited(stopName)) {
    removeStopFavorite(stopName)
    return false
  } else {
    addStopFavorite(stopName)
    return true
  }
}

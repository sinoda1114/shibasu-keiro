export interface StopFavorite {
  stopName: string
  areaId: string
}

const KEY = 'shibasu_keiro_stop_favorites_v2'

export function getStopFavorites(): StopFavorite[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is StopFavorite =>
        typeof s === 'object' && s !== null &&
        typeof s.stopName === 'string' &&
        typeof s.areaId === 'string'
    )
  } catch {
    return []
  }
}

export function isStopFavorited(stopName: string, areaId: string): boolean {
  return getStopFavorites().some(f => f.stopName === stopName && f.areaId === areaId)
}

export function addStopFavorite(stopName: string, areaId: string): void {
  const current = getStopFavorites()
  if (current.some(f => f.stopName === stopName && f.areaId === areaId)) return
  try {
    localStorage.setItem(KEY, JSON.stringify([{ stopName, areaId }, ...current]))
  } catch {
    // ストレージ容量超過等では状態を変えない
  }
}

export function removeStopFavorite(stopName: string, areaId: string): void {
  const current = getStopFavorites()
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(current.filter(f => !(f.stopName === stopName && f.areaId === areaId)))
    )
  } catch {
    // ストレージ書き込み失敗時は無視
  }
}

export function toggleStopFavorite(stopName: string, areaId: string): boolean {
  if (isStopFavorited(stopName, areaId)) {
    removeStopFavorite(stopName, areaId)
    return false
  } else {
    addStopFavorite(stopName, areaId)
    return true
  }
}

import { readLocalStorage, writeLocalStorage } from '@/lib/safe-storage'

export interface StopFavorite {
  stopName: string
  areaId: string
}

const KEY = 'shibasu_keiro_stop_favorites_v2'

export function getStopFavorites(): StopFavorite[] {
  if (typeof window === 'undefined') return []
  const raw = readLocalStorage(KEY)
  if (!raw) return []
  try {
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

/** 保存できたら true（既に登録済みで書き込み不要な場合も true）。遮断・容量超過なら false で状態は変わらない */
export function addStopFavorite(stopName: string, areaId: string): boolean {
  const current = getStopFavorites()
  if (current.some(f => f.stopName === stopName && f.areaId === areaId)) return true
  return writeLocalStorage(KEY, JSON.stringify([{ stopName, areaId }, ...current]))
}

/** 保存できたら true。遮断・容量超過なら false で登録済みのまま残る */
export function removeStopFavorite(stopName: string, areaId: string): boolean {
  const current = getStopFavorites()
  return writeLocalStorage(
    KEY,
    JSON.stringify(current.filter(f => !(f.stopName === stopName && f.areaId === areaId)))
  )
}

/** 登録と解除を切り替える。保存できたら true、できなければ false（状態は変わらない） */
export function toggleStopFavorite(stopName: string, areaId: string): boolean {
  return isStopFavorited(stopName, areaId)
    ? removeStopFavorite(stopName, areaId)
    : addStopFavorite(stopName, areaId)
}

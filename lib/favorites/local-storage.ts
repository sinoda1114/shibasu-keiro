import { PROVIDERS } from '@/lib/providers/providers'

export interface FavoriteRoute {
  id: string
  providerId: string
  fromStopName: string
  toStopName: string
  createdAt: string
}

const STORAGE_KEY = 'shibasu_keiro_favorites'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getFavorites(): FavoriteRoute[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as FavoriteRoute[]
  } catch {
    return []
  }
}

export function addFavorite(from: string, to: string): FavoriteRoute {
  const favorites = getFavorites()
  const newItem: FavoriteRoute = {
    id: generateId(),
    providerId: PROVIDERS.NAGOYA_CITY_BUS,
    fromStopName: from,
    toStopName: to,
    createdAt: new Date().toISOString(),
  }
  const updated = [newItem, ...favorites]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return newItem
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites()
  const updated = favorites.filter((f) => f.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function reverseFavorite(id: string): void {
  const favorites = getFavorites()
  const updated = favorites.map((f) => {
    if (f.id !== id) return f
    return { ...f, fromStopName: f.toStopName, toStopName: f.fromStopName }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

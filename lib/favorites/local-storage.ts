export interface FavoriteRoute {
  id: string
  areaId: string
  providerDisplayName: string
  fromStopName: string
  toStopName: string
  createdAt: string
}

const STORAGE_KEY = 'shibasu_keiro_favorites_v2'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function migrateProviderName(name: string): string {
  if (typeof name !== 'string') return name
  return name.includes('・') ? name.split('・')[0] : name
}

export function getFavorites(): FavoriteRoute[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const favorites = parsed as FavoriteRoute[]
    const migrated = favorites.map((f) => {
      const name = migrateProviderName(f.providerDisplayName)
      return name !== f.providerDisplayName ? { ...f, providerDisplayName: name } : f
    })
    if (migrated.some((f, i) => f !== favorites[i])) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      } catch {
        // 書き戻し失敗（容量制限等）でも読み取り結果は返す
      }
    }
    return migrated
  } catch {
    return []
  }
}

export function addFavorite(
  from: string,
  to: string,
  areaId: string,
  providerDisplayName: string
): FavoriteRoute {
  const favorites = getFavorites()
  const newItem: FavoriteRoute = {
    id: generateId(),
    areaId,
    providerDisplayName,
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

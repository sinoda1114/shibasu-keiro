import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '../db/client'
import { gtfsVersions, gtfsCalendar, gtfsCalendarDates } from '../db/schema'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5分

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const versionCache = new Map<string, CacheEntry<string | null>>()
const serviceIdsCache = new Map<string, CacheEntry<string[]>>()

function pruneExpired<T>(cache: Map<string, CacheEntry<T>>): void {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}

export async function getActiveVersionId(providerId: string): Promise<string | null> {
  const now = Date.now()
  const cached = versionCache.get(providerId)
  if (cached && cached.expiresAt > now) return cached.value

  const rows = await db
    .select({ id: gtfsVersions.id })
    .from(gtfsVersions)
    .where(and(eq(gtfsVersions.providerId, providerId), eq(gtfsVersions.status, 'active')))
    .limit(1)
  const value = rows[0]?.id ?? null

  pruneExpired(versionCache)
  versionCache.set(providerId, { value, expiresAt: now + CACHE_TTL_MS })
  return value
}

/**
 * 指定日付に有効な service_id 集合を解決する。
 * calendar_dates の例外（追加/削除）を calendar の曜日判定に重ねる。
 */
export async function resolveServiceIds(
  providerId: string,
  gtfsVersionId: string,
  dateStr: string // YYYYMMDD
): Promise<string[]> {
  const cacheKey = `${providerId}:${gtfsVersionId}:${dateStr}`
  const now = Date.now()
  const cached = serviceIdsCache.get(cacheKey)
  if (cached && cached.expiresAt > now) return cached.value

  const dowCol = getDowColumn(dateStr)

  // 1. calendar から全 service_id を取得し、曜日カラムで JS 側フィルタ
  const calRows = await db
    .select({
      serviceId: gtfsCalendar.serviceId,
      monday: gtfsCalendar.monday,
      tuesday: gtfsCalendar.tuesday,
      wednesday: gtfsCalendar.wednesday,
      thursday: gtfsCalendar.thursday,
      friday: gtfsCalendar.friday,
      saturday: gtfsCalendar.saturday,
      sunday: gtfsCalendar.sunday,
    })
    .from(gtfsCalendar)
    .where(
      and(
        eq(gtfsCalendar.providerId, providerId),
        eq(gtfsCalendar.gtfsVersionId, gtfsVersionId),
        lte(gtfsCalendar.startDate, dateStr),
        gte(gtfsCalendar.endDate, dateStr)
      )
    )

  const active = new Set(
    calRows.filter((r) => r[dowCol] === 1).map((r) => r.serviceId)
  )

  // 2. calendar_dates で当日の例外を適用
  const exRows = await db
    .select({ serviceId: gtfsCalendarDates.serviceId, exceptionType: gtfsCalendarDates.exceptionType })
    .from(gtfsCalendarDates)
    .where(
      and(
        eq(gtfsCalendarDates.providerId, providerId),
        eq(gtfsCalendarDates.gtfsVersionId, gtfsVersionId),
        eq(gtfsCalendarDates.date, dateStr)
      )
    )

  for (const ex of exRows) {
    if (ex.exceptionType === 1) active.add(ex.serviceId)    // 追加
    if (ex.exceptionType === 2) active.delete(ex.serviceId) // 削除
  }

  const value = Array.from(active)
  pruneExpired(serviceIdsCache)
  serviceIdsCache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS })
  return value
}

type DowColumn = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

function getDowColumn(dateStr: string): DowColumn {
  const y = parseInt(dateStr.slice(0, 4))
  const m = parseInt(dateStr.slice(4, 6)) - 1
  const d = parseInt(dateStr.slice(6, 8))
  const dow = new Date(y, m, d).getDay() // 0=Sun ... 6=Sat
  const cols: DowColumn[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return cols[dow]
}

export function secondsToHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function todayYYYYMMDD(): string {
  const now = new Date()
  // Vercel は UTC で動作するため JST (UTC+9) に変換
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

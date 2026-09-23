import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { getDb } from '@/lib/db/client'
import { busStops, busStopTimes, busTrips } from '@/lib/db/schema'
import { getActiveVersionId, resolveServiceIds } from '@/lib/gtfs/service-resolver'
import { formatJstYYYYMMDD, getServiceDate, isDayType, isYYYYMMDD } from '@/lib/jst'

export interface TimetableDirection {
  headsign: string
  entries: { hour: number; minutes: number[] }[]
  lastDeparture: { hour: number; minute: number }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const stopName = searchParams.get('stopName')?.trim()
  // 検索（/api/routes/direct）と同じく日付で運行日を引き、calendar_dates の例外（祝日・年末年始の運休や臨時便）を反映する
  const dateParam = searchParams.get('date')
  // 更新前の画面（開いたままのタブ）は date を送らず dayType だけを送る。黙って今日の時刻表を返さず、
  // その区分の代表日で引く。画面の更新が行き渡ったら、この分岐は消してよい
  const legacyDayType = searchParams.get('dayType')
  const dateStr = dateParam ?? (isDayType(legacyDayType) ? getServiceDate(legacyDayType) : formatJstYYYYMMDD())
  // 日付なしの URL は日付が変わると別の時刻表を指すので、CDN に残さない
  const cacheControl = dateParam === null ? 'no-store' : 's-maxage=3600, stale-while-revalidate=86400'
  const providerId = searchParams.get('provider') ?? 'nagoya_city_bus'

  if (!stopName) {
    return NextResponse.json({ success: false, error: 'stopName は必須です' }, { status: 400 })
  }
  if (dateParam === null && legacyDayType !== null && !isDayType(legacyDayType)) {
    return NextResponse.json({ success: false, error: 'dayType は weekday / saturday / holiday のいずれかで指定してください' }, { status: 400 })
  }
  // 存在しない日付を曜日の計算で別の日に読み替えて黙って返さない
  if (!isYYYYMMDD(dateStr)) {
    return NextResponse.json({ success: false, error: 'date は YYYYMMDD 形式の実在する日付で指定してください' }, { status: 400 })
  }

  const versionId = await getActiveVersionId(providerId)
  if (!versionId) {
    return NextResponse.json(
      { success: false, error: 'データが利用できません。インポートをお待ちください。' },
      { status: 503 }
    )
  }

  const [stops, serviceIds] = await Promise.all([
    getDb()
      .select({ stopId: busStops.stopId })
      .from(busStops)
      .where(and(eq(busStops.providerId, providerId), eq(busStops.gtfsVersionId, versionId), eq(busStops.stopName, stopName))),
    resolveServiceIds(providerId, versionId, dateStr),
  ])

  if (stops.length === 0) {
    return NextResponse.json({ success: false, error: 'バス停が見つかりません' }, { status: 404 })
  }
  if (serviceIds.length === 0) {
    return NextResponse.json({ success: true, data: [] }, { headers: { 'Cache-Control': cacheControl } })
  }

  const stopIds = stops.map((s) => s.stopId)

  const rows = await getDb()
    .select({
      headsign: busTrips.tripHeadsign,
      departureTimeSeconds: busStopTimes.departureTimeSeconds,
    })
    .from(busStopTimes)
    .innerJoin(
      busTrips,
      and(
        eq(busStopTimes.tripId, busTrips.tripId),
        eq(busStopTimes.providerId, busTrips.providerId),
        eq(busStopTimes.gtfsVersionId, busTrips.gtfsVersionId)
      )
    )
    .where(
      and(
        eq(busStopTimes.providerId, providerId),
        eq(busStopTimes.gtfsVersionId, versionId),
        inArray(busStopTimes.stopId, stopIds),
        inArray(busTrips.serviceId, serviceIds),
        isNotNull(busStopTimes.departureTimeSeconds)
      )
    )
    .orderBy(busStopTimes.departureTimeSeconds)

  // headsign ごとにグループ化して時刻表を構築
  const byHeadsign = new Map<string, Set<number>>()
  for (const row of rows) {
    const key = row.headsign ?? '（方面不明）'
    if (!byHeadsign.has(key)) byHeadsign.set(key, new Set())
    if (row.departureTimeSeconds != null) byHeadsign.get(key)!.add(row.departureTimeSeconds)
  }

  const data: TimetableDirection[] = Array.from(byHeadsign.entries()).map(([headsign, secondsSet]) => {
    const sorted = [...secondsSet].sort((a, b) => a - b)

    const hourMap = new Map<number, number[]>()
    for (const s of sorted) {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      if (!hourMap.has(h)) hourMap.set(h, [])
      hourMap.get(h)!.push(m)
    }

    const entries = Array.from(hourMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, minutes]) => ({ hour, minutes }))

    const lastSeconds = sorted.at(-1) ?? 0
    const lastH = Math.floor(lastSeconds / 3600)
    const lastM = Math.floor((lastSeconds % 3600) / 60)

    return { headsign, entries, lastDeparture: { hour: lastH, minute: lastM } }
  })

  return NextResponse.json({ success: true, data }, {
    headers: { 'Cache-Control': cacheControl },
  })
}

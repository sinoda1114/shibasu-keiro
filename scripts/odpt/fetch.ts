import type { OdptBusstopPole, OdptBusroutePattern, OdptBusTimetable } from './types'

const BASE_URL = 'https://api.odpt.org/api/v4'
const OPERATOR = 'odpt.Operator:SotetsuBus'

// ODPT Sotetsu Bus API は $limit/$skip をサポートしていない。
// 全件が一度に返るため、リクエスト1回でフェッチする。
async function fetchAll<T>(resource: string, consumerKey: string): Promise<T[]> {
  const url = `${BASE_URL}/${resource}?odpt:operator=${OPERATOR}&acl:consumerKey=${consumerKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ODPT API ${resource} failed: ${res.status} ${res.statusText}`)
  return (await res.json()) as T[]
}

export async function fetchBusstopPoles(consumerKey: string): Promise<OdptBusstopPole[]> {
  return fetchAll<OdptBusstopPole>('odpt:BusstopPole', consumerKey)
}

export async function fetchBusroutePatterns(consumerKey: string): Promise<OdptBusroutePattern[]> {
  return fetchAll<OdptBusroutePattern>('odpt:BusroutePattern', consumerKey)
}

export async function fetchBusTimetables(consumerKey: string): Promise<OdptBusTimetable[]> {
  return fetchAll<OdptBusTimetable>('odpt:BusTimetable', consumerKey)
}

export async function fetchLatestDcDate(consumerKey: string): Promise<string | null> {
  // 1件でも取得できれば dc:date を返す（全件フェッチは重いため BusstopPole で代用）
  const url = `${BASE_URL}/odpt:BusstopPole?odpt:operator=${OPERATOR}&acl:consumerKey=${consumerKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ODPT API probe failed: ${res.status} ${res.statusText}`)
  const records = (await res.json()) as Array<{ 'dc:date'?: string }>
  return records[0]?.['dc:date'] ?? null
}

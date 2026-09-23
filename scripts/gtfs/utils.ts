/**
 * GTFS共通ユーティリティ
 */

/**
 * GTFS時刻文字列 "25:30:00" → 秒数 91800
 */
export function gtfsTimeToSeconds(time: string): number {
  const [h, m, s] = time.split(':').map(Number)
  return h * 3600 + m * 60 + s
}

/**
 * 秒数 → "HH:MM" 表示 (25:30:00 → "01:30"の翌日表示)
 */
export function secondsToHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600) % 24
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * 現在時刻を0時起点秒数に変換
 */
export function nowToSeconds(): number {
  const now = new Date()
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
}

/**
 * UUID生成（crypto.randomUUID）
 */
export function generateId(): string {
  return crypto.randomUUID()
}

export function isOdptFilesUrl(url: string): boolean {
  return url.includes('api.odpt.org/api/v4/files/')
}

/**
 * ODPT が認証エラー（401 / 403）を返したときのエラー。キーの失効・停止に気付けるよう、
 * 原因と更新すべき場所を書く。URL にはキーが入るので、URL もキーも含めない。
 */
export function odptAuthError(status: number, keyLocation: string): Error {
  return new Error(
    `ODPT が認証エラー（HTTP ${status}）を返しました。API キー（acl:consumerKey）が無効か、停止されている可能性があります。` +
    `ODPT の開発者サイトでキーを確認・再発行し、${keyLocation} を更新してください。`
  )
}

export function isOdptAuthFailure(status: number): boolean {
  return status === 401 || status === 403
}

/**
 * ODPT Files URL に date パラメーターを付けてリクエストし、
 * 302 リダイレクト先の Azure Blob URL を返す（最大6ヶ月遡る）。
 *
 * ODPT の仕様:
 * - HEAD リクエストは 404 を返す（GET のみ 302 が返る）
 * - date パラメーターは毎月変わる（例: 20260601 → 20260701）
 * - リダイレクト先は SAS URL（有効期限あり）
 */
export async function resolveOdptUrl(
  rawUrl: string
): Promise<{ blobUrl: string; date: string } | null> {
  const parsed = new URL(rawUrl)
  const token = parsed.searchParams.get('acl:consumerKey') ?? ''
  const baseUrl = `${parsed.origin}${parsed.pathname}`

  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`
    const tryUrl = `${baseUrl}?date=${date}&acl:consumerKey=${token}`

    const r = await fetch(tryUrl, { redirect: 'manual' })
    if (isOdptAuthFailure(r.status)) throw odptAuthError(r.status, 'GitHub の Secret YOKOHAMA_GTFS_URL')
    if (r.status === 302) {
      const location = r.headers.get('location')
      if (location) return { blobUrl: location, date }
    }
  }
  return null
}

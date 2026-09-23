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

/** キーを置いている場所。GitHub Actions では Secret、手元では .env.local */
export function odptKeyLocation(envName: string): string {
  return process.env.GITHUB_ACTIONS === 'true' ? `GitHub の Secret ${envName}` : `.env.local の ${envName}`
}

const MONTHS_TO_TRY = 6

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
  // その月のファイルが無いときも 403 が返りうるので、さかのぼりは最後まで続ける。
  // すべての月が認証エラーだったときだけキーの問題として止める（一部の月だけなら未公開の月とみなす）
  const authFailures: number[] = []
  for (let i = 0; i < MONTHS_TO_TRY; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`
    const tryUrl = `${baseUrl}?date=${date}&acl:consumerKey=${token}`

    const r = await fetch(tryUrl, { redirect: 'manual' })
    if (isOdptAuthFailure(r.status)) authFailures.push(r.status)
    if (r.status === 302) {
      const location = r.headers.get('location')
      if (location) return { blobUrl: location, date }
    }
  }
  // ODPT の Files API（GTFS の ZIP）を使うのは横浜市営バスだけで、URL は YOKOHAMA_GTFS_URL から来る
  if (authFailures.length === MONTHS_TO_TRY) throw odptAuthError(authFailures[0], odptKeyLocation('YOKOHAMA_GTFS_URL'))
  return null
}

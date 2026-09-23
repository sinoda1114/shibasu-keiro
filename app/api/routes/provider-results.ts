import { NextResponse } from 'next/server'

export const NO_ACTIVE_VERSION_ERROR = '時刻表のデータを準備中です。時間をおいて再度お試しください。'

export type ProviderResultsOutcome<T> =
  | { ok: true; results: T[]; hasMissingProvider: boolean }
  | { ok: false; response: NextResponse }

/**
 * 事業者ごとの検索結果をまとめる。有効な GTFS の版が無い事業者の結果は null で受け取る。
 * 版が無いのはインポートの障害で、「便が無い」（空配列）とは別物として扱う（#70）。
 * - エリアの全事業者に版が無い: 503 とエラーの文言を返す（画面は「直通便なし」ではなくエラーを出す）
 * - 一部の事業者だけ版が無い: ログに残し、版のある事業者の結果で続ける（一部の欠落で全体を落とさない）
 */
export function collectProviderResults<T>(
  routeName: string,
  providerIds: readonly string[],
  results: readonly (T | null)[]
): ProviderResultsOutcome<T> {
  const missing = providerIds.filter((_, i) => results[i] === null)

  if (missing.length > 0 && missing.length === providerIds.length) {
    console.error(`[${routeName}] 有効な GTFS の版がありません（全事業者）: ${missing.join(', ')}`)
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: NO_ACTIVE_VERSION_ERROR },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      ),
    }
  }

  if (missing.length > 0) {
    console.warn(`[${routeName}] 有効な GTFS の版がありません（一部の事業者を除いて返します）: ${missing.join(', ')}`)
  }

  return {
    ok: true,
    results: results.filter((r): r is T => r !== null),
    hasMissingProvider: missing.length > 0,
  }
}

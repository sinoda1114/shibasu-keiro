/** URL として解釈できない値の代わりに返す固定文字列 */
export const REDACTED = '(redacted)'

/**
 * URL から問い合わせ文字列・フラグメント・認証情報（user:pass@）を取り除く。
 * ODPT の `?acl:consumerKey=...` のように API キーが問い合わせ文字列に入る URL を
 * DB に保存する前に通す。解釈できない値は中身を返さず REDACTED にする。
 */
export function redactUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return REDACTED
  }
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
}

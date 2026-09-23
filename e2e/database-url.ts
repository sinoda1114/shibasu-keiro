/**
 * E2E の dev サーバーに渡す TURSO_DATABASE_URL。リモート DB（本番 Turso）を遮断する。
 * file: の URL だけを受け付け、それ以外（libsql:// / https:// / 未設定）は file::memory: にする。
 * file: で指定したローカルの DB にはそのまま繋ぐ（CI の file:ci.db もこの経路）。CI 判定には頼らない
 * （CI=false も文字列として真になる。本番の資格情報があるのはむしろ CI 側）。
 */
export function isolatedDatabaseUrl(url: string | undefined): string {
  return url?.startsWith('file:') ? url : 'file::memory:'
}

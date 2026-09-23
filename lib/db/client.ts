import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'

let db: LibSQLDatabase | undefined

// モジュールの読み込み時には接続しない。next build のページデータ収集は全ルートを import するため、
// 読み込み時に接続すると DB の無い環境（CI のビルド等）で SQLITE_CANTOPEN になって落ちる。
export function getDb(): LibSQLDatabase {
  db ??= drizzle(createClient({
    url: process.env.TURSO_DATABASE_URL ?? 'file:.data/local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  }))
  return db
}

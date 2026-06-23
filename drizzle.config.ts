import type { Config } from 'drizzle-kit'

// drizzle-kit は Next.js の .env.local を自動読込しないため手動でロード
// 既に環境変数が設定されている場合（ローカル開発等）は上書きしない
const _existingUrl = process.env.TURSO_DATABASE_URL
const _existingToken = process.env.TURSO_AUTH_TOKEN
try {
  process.loadEnvFile('.env.local')
} catch {
  // .env.local が存在しない環境（CI等）では無視
}
if (_existingUrl !== undefined) process.env.TURSO_DATABASE_URL = _existingUrl
if (_existingToken !== undefined) process.env.TURSO_AUTH_TOKEN = _existingToken

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:.data/local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config

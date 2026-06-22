import type { Config } from 'drizzle-kit'

// drizzle-kit は Next.js の .env.local を自動読込しないため手動でロード
try {
  process.loadEnvFile('.env.local')
} catch {
  // .env.local が存在しない環境（CI等）では無視
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:.data/local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config

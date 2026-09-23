import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // E2E の dev サーバーはリモート DB（本番 Turso）に接続しない。file: の URL だけを受け付け、
      // それ以外（libsql:// / https:// / 未設定）は file::memory: に隔離する。CI 判定には頼らない
      // （CI=false も文字列として真になる。本番の資格情報があるのはむしろ CI 側）。
      // CI は .github/ci.env の file:ci.db を db:migrate と共有する。file::memory: はプロセスごとに
      // 別の DB になるため、マイグレーションを当てたプロセスと共有できない。
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL?.startsWith('file:')
        ? process.env.TURSO_DATABASE_URL
        : 'file::memory:',
    },
  },
})

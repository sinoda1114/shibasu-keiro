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
      // file::memory: はプロセスごとに別の DB になるため、db:migrate を適用した
      // プロセスとこの dev サーバーが別々の空 DB を見て "no such table" で落ちる。
      // CI では .github/ci.env の file:ci.db を共有する。
      //
      // 外部の TURSO_DATABASE_URL を尊重するのは CI に限る。ローカルは常に隔離する。
      // direnv 等で本番 Turso の URL を export している手元だと、
      // 無条件に尊重すると E2E が本番 DB に接続してしまうため。
      TURSO_DATABASE_URL: process.env.CI
        ? (process.env.TURSO_DATABASE_URL ?? 'file:ci.db')
        : 'file::memory:',
    },
  },
})

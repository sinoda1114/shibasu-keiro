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
      // 外から TURSO_DATABASE_URL が与えられていればそれを使う（CI は .github/ci.env の file:ci.db）。
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? 'file::memory:',
    },
  },
})

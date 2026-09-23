import { defineConfig, devices } from '@playwright/test'
import { isolatedDatabaseUrl } from './e2e/database-url'

// 開発用の pnpm dev（3000 番、.env.local の DB に接続）とは別のポートで毎回起動する。
// 既存サーバーを再利用すると webServer.env が届かず、E2E が .env.local の DB を見てしまうため。
// 同じ worktree で pnpm dev が動いていると .next を取り合って起動できないので、止めてから実行する。
// E2E_PORT は worktree を並行させるときの上書き用
const E2E_PORT = Number(process.env.E2E_PORT ?? 3100)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // CI は .github/ci.env の file:ci.db を db:migrate と共有する（file::memory: はプロセスごとに別の DB）
      TURSO_DATABASE_URL: isolatedDatabaseUrl(process.env.TURSO_DATABASE_URL),
      TURSO_AUTH_TOKEN: '',
    },
  },
})

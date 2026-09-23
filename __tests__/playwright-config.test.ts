import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL = { url: process.env.TURSO_DATABASE_URL, ci: process.env.CI }

async function webServerDatabaseUrl(env: { url?: string; ci?: string }) {
  for (const [key, value] of [['TURSO_DATABASE_URL', env.url], ['CI', env.ci]] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.resetModules()
  const { default: config } = await import('../playwright.config')
  const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer
  return webServer?.env?.TURSO_DATABASE_URL
}

afterEach(() => {
  for (const [key, value] of [['TURSO_DATABASE_URL', ORIGINAL.url], ['CI', ORIGINAL.ci]] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('E2E の dev サーバーに渡す TURSO_DATABASE_URL', () => {
  it.each([
    ['CI', { ci: 'true', url: 'libsql://prod.turso.io' }],
    ['CI=false', { ci: 'false', url: 'libsql://prod.turso.io' }],
    ['ローカル', { url: 'libsql://prod.turso.io' }],
    ['https', { ci: '1', url: 'https://prod.turso.io' }],
  ])('%s でリモート DB の URL は渡さず隔離する', async (_label, env) => {
    expect(await webServerDatabaseUrl(env)).toBe('file::memory:')
  })

  it('ローカルファイルの URL はそのまま使う（CI の file:ci.db）', async () => {
    expect(await webServerDatabaseUrl({ ci: 'true', url: 'file:ci.db' })).toBe('file:ci.db')
    expect(await webServerDatabaseUrl({ url: 'file:ci.db' })).toBe('file:ci.db')
  })

  it('未設定なら file::memory: に落ちる', async () => {
    expect(await webServerDatabaseUrl({})).toBe('file::memory:')
  })
})

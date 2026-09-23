import { describe, expect, it } from 'vitest'
import { isolatedDatabaseUrl } from '../e2e/database-url'

describe('isolatedDatabaseUrl（E2E の dev サーバーに渡す DB URL）', () => {
  it.each(['libsql://prod.turso.io', 'https://prod.turso.io', 'ws://prod.turso.io', undefined, ''])(
    '%s はリモート・未設定として file::memory: に隔離する',
    (url) => expect(isolatedDatabaseUrl(url)).toBe('file::memory:'),
  )

  it('ローカルファイルの URL はそのまま使う（CI の file:ci.db）', () => {
    expect(isolatedDatabaseUrl('file:ci.db')).toBe('file:ci.db')
  })
})

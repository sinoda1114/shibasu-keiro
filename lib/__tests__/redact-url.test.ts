import { describe, it, expect } from 'vitest'
import { redactUrl, REDACTED } from '../redact-url'

describe('redactUrl', () => {
  it('ODPT の URL から acl:consumerKey を含む問い合わせ文字列を取り除く', () => {
    const url =
      'https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip?acl:consumerKey=TESTKEY'
    const result = redactUrl(url)
    expect(result).toBe('https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Bus.zip')
    expect(result).not.toContain('TESTKEY')
    expect(result).not.toContain('?')
  })

  it('URL に埋め込まれた認証情報（user:pass@）を取り除く', () => {
    const result = redactUrl('https://user:TESTPASS@example.com/gtfs.zip')
    expect(result).toBe('https://example.com/gtfs.zip')
    expect(result).not.toContain('TESTPASS')
    expect(result).not.toContain('user')
  })

  it('認証情報と問い合わせ文字列とフラグメントを同時に取り除く', () => {
    const result = redactUrl('https://user:TESTPASS@example.com/a/b.zip?token=TESTKEY&x=1#frag')
    expect(result).toBe('https://example.com/a/b.zip')
  })

  it('問い合わせ文字列の無い URL はそのまま返す', () => {
    expect(redactUrl('https://example.com/gtfs.zip')).toBe('https://example.com/gtfs.zip')
    expect(redactUrl('https://ckan.odpt.org/organization/sotetsu_bus')).toBe(
      'https://ckan.odpt.org/organization/sotetsu_bus'
    )
  })

  it('URL として解釈できない文字列は安全側の固定値を返す', () => {
    expect(redactUrl('not a url?acl:consumerKey=TESTKEY')).toBe(REDACTED)
    expect(redactUrl('')).toBe(REDACTED)
    expect(redactUrl('/relative/path?key=TESTKEY')).toBe(REDACTED)
  })
})

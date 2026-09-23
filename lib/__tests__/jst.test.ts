import { describe, it, expect } from 'vitest'
import { getJstDayType, getJstTime } from '../jst'

describe('getJstDayType', () => {
  it('UTC では金曜でも JST で土曜なら saturday', () => {
    expect(getJstDayType(new Date('2026-09-25T15:00:00Z'))).toBe('saturday')
  })

  it('UTC では土曜でも JST で日曜なら holiday', () => {
    expect(getJstDayType(new Date('2026-09-26T15:00:00Z'))).toBe('holiday')
  })

  it('UTC では日曜でも JST で月曜なら weekday', () => {
    expect(getJstDayType(new Date('2026-09-27T15:00:00Z'))).toBe('weekday')
  })

  it('平日の祝日は holiday（2026-10-12 スポーツの日・月曜）', () => {
    expect(getJstDayType(new Date('2026-10-12T03:00:00+09:00'))).toBe('holiday')
  })

  it('UTC では前日でも JST で祝日なら holiday（2026-09-22 国民の休日の 0:30）', () => {
    expect(getJstDayType(new Date('2026-09-21T15:30:00Z'))).toBe('holiday')
  })

  it('土曜の祝日は休日ダイヤに合わせて holiday（2028-04-29 昭和の日・土曜）', () => {
    expect(getJstDayType(new Date('2028-04-29T12:00:00+09:00'))).toBe('holiday')
  })

  it('祝日の翌日の平日は weekday（2026-10-13）', () => {
    expect(getJstDayType(new Date('2026-10-13T12:00:00+09:00'))).toBe('weekday')
  })

  it('JST 金曜 23:59 は weekday', () => {
    expect(getJstDayType(new Date('2026-09-25T14:59:00Z'))).toBe('weekday')
  })
})

describe('getJstTime', () => {
  it('UTC に 9 時間足した時分を返す', () => {
    expect(getJstTime(new Date('2026-09-26T01:05:00Z'))).toEqual({ hour: 10, minute: 5 })
  })

  it('日付をまたいでも 0〜23 時で返す', () => {
    expect(getJstTime(new Date('2026-09-26T15:30:00Z'))).toEqual({ hour: 0, minute: 30 })
  })
})

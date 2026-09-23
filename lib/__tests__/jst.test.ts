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

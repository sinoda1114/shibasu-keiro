import { describe, it, expect } from 'vitest'
import { formatJstYYYYMMDD, getJstDayType, getJstSecondsOfDay, getJstTime, formatServiceDateLabel, getServiceDate, isDayType, isYYYYMMDD } from '../jst'

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

describe('getServiceDate（曜日区分から検索に使う日付を選ぶ）', () => {
  const at = (iso: string) => new Date(`${iso}T12:00:00+09:00`)

  it('今日がその区分なら今日を返す（平日の祝日に休日を選ぶと当日。祝日の例外を当日の日付で引ける）', () => {
    expect(getServiceDate('holiday', at('2026-10-12'))).toBe('20261012')
    expect(getServiceDate('weekday', at('2026-10-13'))).toBe('20261013')
    expect(getServiceDate('saturday', at('2026-10-17'))).toBe('20261017')
  })

  it('今日が違う区分なら、その区分に当たる直近の日を返す（祝日は平日・土曜として選ばない）', () => {
    expect(getServiceDate('weekday', at('2026-10-12'))).toBe('20261013')
    expect(getServiceDate('holiday', at('2026-10-13'))).toBe('20261018')
  })

  it('平日に休日を選んだら直近の祝日ではなく次の日曜（元日などの特別な日を選ばない）', () => {
    expect(getServiceDate('holiday', at('2026-12-28'))).toBe('20270103')
    expect(getServiceDate('holiday', at('2026-11-02'))).toBe('20261108')
    expect(getServiceDate('weekday', at('2026-09-19'))).toBe('20260924')
    expect(getServiceDate('saturday', at('2028-04-28'))).toBe('20280506')
  })

  it('JST の日付で判定する（UTC では前日の 15:30 でも JST では祝日当日）', () => {
    expect(getServiceDate('holiday', new Date('2026-10-11T15:30:00Z'))).toBe('20261012')
  })
})

describe('getJstSecondsOfDay', () => {
  it('JST のその日の経過秒を返す（UTC では前日でも JST の日付で数える）', () => {
    expect(getJstSecondsOfDay(new Date('2026-10-11T15:30:15Z'))).toBe(30 * 60 + 15)
    expect(getJstSecondsOfDay(new Date('2026-10-12T01:05:00Z'))).toBe(10 * 3600 + 5 * 60)
  })
})

describe('formatJstYYYYMMDD', () => {
  it('JST の日付を YYYYMMDD で返す', () => {
    expect(formatJstYYYYMMDD(new Date('2026-10-11T15:30:00Z'))).toBe('20261012')
    expect(formatJstYYYYMMDD(new Date('2026-10-11T14:59:00Z'))).toBe('20261011')
  })
})

describe('isDayType', () => {
  it.each(['weekday', 'saturday', 'holiday'])('%s は曜日区分', (v) => expect(isDayType(v)).toBe(true))
  it.each(['bogus', 'Weekday', '', null, undefined, 1])('%s は曜日区分でない', (v) => expect(isDayType(v)).toBe(false))
})

describe('isYYYYMMDD', () => {
  it.each(['20260924', '20240229', '20261231'])('%s は日付', (v) => expect(isYYYYMMDD(v)).toBe(true))
  it.each(['2026-09-24', '2026092', '202609240', '20260230', '20250229', '20261301', '20260000', '20260900', '', null, undefined, 20260924])(
    '%s は日付でない（形式違い・存在しない日付）',
    (v) => expect(isYYYYMMDD(v)).toBe(false),
  )
})

describe('formatServiceDateLabel（画面に出す対象日）', () => {
  it('月/日（曜日）で返す', () => {
    expect(formatServiceDateLabel('20261013')).toBe('10/13（火）')
    expect(formatServiceDateLabel('20261018')).toBe('10/18（日）')
    expect(formatServiceDateLabel('20270103')).toBe('1/3（日）')
  })

  it('祝日なら祝日と分かるように「・祝」を付ける', () => {
    expect(formatServiceDateLabel('20261012')).toBe('10/12（月・祝）')
    expect(formatServiceDateLabel('20260503')).toBe('5/3（日・祝）')
  })
})

import { isJpHoliday } from './jp-holidays'

// 時刻表は JST で組まれているので、ブラウザのタイムゾーンに関係なく JST で「今」を決める

export const DAY_TYPES = ['weekday', 'saturday', 'holiday'] as const
export type DayType = (typeof DAY_TYPES)[number]

/** URL のクエリなど外から来た値が曜日区分か */
export function isDayType(value: unknown): value is DayType {
  return typeof value === 'string' && (DAY_TYPES as readonly string[]).includes(value)
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

// UTC の各フィールドが JST の値になる Date を返す（getUTC* で読む）
function toJst(now: Date): Date {
  return new Date(now.getTime() + JST_OFFSET_MS)
}

// 祝日は曜日に関係なく休日ダイヤで運行するので、土曜の祝日も holiday にする
export function getJstDayType(now: Date = new Date()): DayType {
  const jst = toJst(now)
  const day = jst.getUTCDay()
  if (day === 0 || isJpHoliday(jst.getUTCFullYear(), jst.getUTCMonth() + 1, jst.getUTCDate())) return 'holiday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

/** JST のその日の経過秒（0 時からの秒数） */
export function getJstSecondsOfDay(now: Date = new Date()): number {
  const jst = toJst(now)
  return jst.getUTCHours() * 3600 + jst.getUTCMinutes() * 60 + jst.getUTCSeconds()
}

export function getJstTime(now: Date = new Date()): { hour: number; minute: number } {
  const jst = toJst(now)
  return { hour: jst.getUTCHours(), minute: jst.getUTCMinutes() }
}

export function formatJstYYYYMMDD(now: Date = new Date()): string {
  const jst = toJst(now)
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${jst.getUTCFullYear()}${m}${d}`
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 曜日区分から検索に使う日付を JST の YYYYMMDD で返す。検索はこの日付で運行日を引く。
 * 今日がその区分なら今日。平日の祝日に休日を選べば当日になり、事業者が日付ごとに持つ祝日の例外が効く。
 * 今日が違う区分なら代表日を選ぶ。休日は次の日曜（直近の祝日だと元日など特別なダイヤの日を拾う）、
 * 平日・土曜は祝日を除いた直近の日。
 */
export function getServiceDate(dayType: DayType, now: Date = new Date()): string {
  if (getJstDayType(now) === dayType) return formatJstYYYYMMDD(now)
  for (let i = 1; i < 31; i++) {
    const day = new Date(now.getTime() + i * DAY_MS)
    const isRepresentative = dayType === 'holiday' ? toJst(day).getUTCDay() === 0 : getJstDayType(day) === dayType
    if (isRepresentative) return formatJstYYYYMMDD(day)
  }
  throw new Error(`${dayType} に当たる日が 31 日以内に見つかりません`)
}

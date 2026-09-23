import { isJpHoliday } from './jp-holidays'

// 時刻表は JST で組まれているので、ブラウザのタイムゾーンに関係なく JST で「今」を決める

export type DayType = 'weekday' | 'saturday' | 'holiday'

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

export function getJstTime(now: Date = new Date()): { hour: number; minute: number } {
  const jst = toJst(now)
  return { hour: jst.getUTCHours(), minute: jst.getUTCMinutes() }
}

function formatJstYmd(now: Date): string {
  const jst = toJst(now)
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${jst.getUTCFullYear()}${m}${d}`
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 曜日区分に当たる直近の日（今日を含む）を JST の YYYYMMDD で返す。検索はこの日付で運行日を引く。
 * 平日の祝日に休日を選べば当日になり、事業者が日付ごとに持つ祝日の例外がそのまま効く。
 * 祝日は平日・土曜として選ばない。
 */
export function getServiceDate(dayType: DayType, now: Date = new Date()): string {
  for (let i = 0; i < 31; i++) {
    const day = new Date(now.getTime() + i * DAY_MS)
    if (getJstDayType(day) === dayType) return formatJstYmd(day)
  }
  throw new Error(`${dayType} に当たる日が 31 日以内に見つかりません`)
}

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

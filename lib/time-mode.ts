// 検索する時刻の指定方法。出発時刻で探すか、到着時刻で探すか

export const TIME_MODES = ['depart', 'arrive'] as const
export type TimeMode = (typeof TIME_MODES)[number]

/** URL のクエリなど外から来た値が時刻の指定方法か */
export function isTimeMode(value: unknown): value is TimeMode {
  return typeof value === 'string' && (TIME_MODES as readonly string[]).includes(value)
}

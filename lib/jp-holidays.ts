// 国民の祝日に関する法律の現行の規則（2022 年以降）で祝日・休日を判定する。
// 外部データに頼らず将来の年も判定できるよう、日付の規則と春分・秋分の近似式で計算する。
// 春分・秋分は毎年 2 月 1 日の官報で正式に決まるが、この式は 2099 年まで一致する。
// 特別措置法による移動（2020・2021 年の五輪対応など）は扱わない。

function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

// m 月の第 n 月曜日
function nthMonday(y: number, m: number, n: number): number {
  const first = dayOfWeek(y, m, 1)
  return 1 + ((8 - first) % 7) + (n - 1) * 7
}

function equinoxDay(y: number, base: number): number {
  return Math.floor(base + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))
}

// 振替休日・国民の休日を除いた、法律が名前を付けている祝日
function isNamedHoliday(y: number, m: number, d: number): boolean {
  switch (m) {
    case 1: return d === 1 || d === nthMonday(y, 1, 2)
    case 2: return d === 11 || d === 23
    case 3: return d === equinoxDay(y, 20.8431)
    case 4: return d === 29
    case 5: return d === 3 || d === 4 || d === 5
    case 7: return d === nthMonday(y, 7, 3)
    case 8: return d === 11
    case 9: return d === nthMonday(y, 9, 3) || d === equinoxDay(y, 23.2488)
    case 10: return d === nthMonday(y, 10, 2)
    case 11: return d === 3 || d === 23
    default: return false
  }
}

function shift(y: number, m: number, d: number, days: number): [number, number, number] {
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
}

// 振替休日: 日曜の祝日のあと、祝日が続くあいだを飛ばした最初の平日
function isSubstituteHoliday(y: number, m: number, d: number): boolean {
  if (isNamedHoliday(y, m, d)) return false
  for (let back = 1; ; back++) {
    const [py, pm, pd] = shift(y, m, d, -back)
    if (!isNamedHoliday(py, pm, pd)) return false
    if (dayOfWeek(py, pm, pd) === 0) return true
  }
}

// 国民の休日: 前日と翌日が祝日に挟まれた、祝日でない日
function isCitizensHoliday(y: number, m: number, d: number): boolean {
  if (isNamedHoliday(y, m, d) || dayOfWeek(y, m, d) === 0) return false
  return isNamedHoliday(...shift(y, m, d, -1)) && isNamedHoliday(...shift(y, m, d, 1))
}

/** 日本の祝日・休日（振替休日と国民の休日を含む）か。月は 1〜12 */
export function isJpHoliday(y: number, m: number, d: number): boolean {
  return isNamedHoliday(y, m, d) || isSubstituteHoliday(y, m, d) || isCitizensHoliday(y, m, d)
}

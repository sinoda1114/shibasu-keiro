// ストレージが遮断された環境（Safari の Cookie 全遮断など）では localStorage への参照自体が SecurityError を投げる
export function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 保存できたら true。遮断・容量超過で保存できなくても例外は投げない */
export function writeLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

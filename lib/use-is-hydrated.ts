'use client'

import { useSyncExternalStore } from 'react'

const neverChanges = () => () => {}

/**
 * ハイドレーション完了後に true を返す。
 * サーバー描画と初回クライアント描画では false なので、
 * localStorage などサーバーに存在しない値を描画に使う箇所をこれで囲むと
 * ハイドレーション不一致を避けられる。
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false
  )
}

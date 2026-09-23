import { test, expect } from '@playwright/test'

// 2026-10-12（月曜・スポーツの日）の JST 正午。ブラウザの時計を固定し、実行した時刻に左右されないようにする
const JST_MONDAY_HOLIDAY_NOON = new Date('2026-10-12T12:00:00+09:00')

test('トップページの dayType が未知の値なら、今日の曜日区分を選ぶ', async ({ page }) => {
  await page.clock.setFixedTime(JST_MONDAY_HOLIDAY_NOON)
  await page.goto('/?dayType=bogus&area=nagoya')
  await expect(page.getByRole('radio', { name: '休日' })).toBeChecked()
})

test.describe('検索結果ページ', () => {
  // PWA の Service Worker に fetch を取られると page.route のモックが効かないので止める
  test.use({ serviceWorkers: 'block' })

  test('dayType が未知の値なら平日として検索し、バッジも平日と表示する', async ({ page }) => {
    await page.clock.setFixedTime(JST_MONDAY_HOLIDAY_NOON)
    const dates: string[] = []
    await page.route('/api/routes/direct*', async (route) => {
      dates.push(new URL(route.request().url()).searchParams.get('date') ?? '')
      await route.fulfill({ json: { success: true, data: [] } })
    })
    await page.goto('/search?from=栄&to=名古屋駅&area=nagoya&dayType=bogus')
    await expect(page.getByText('平日', { exact: true })).toBeVisible()
    await expect(page.getByText('bogus')).toHaveCount(0)
    // 祝日の月曜に平日を選ぶと、祝日を除いた直近の平日（翌日）で検索する。バッジは応答を待たずに
    // 描画されるので、リクエストが届くまで待ってから確かめる
    await expect.poll(() => dates.length).toBeGreaterThan(0)
    expect(new Set(dates)).toEqual(new Set(['20261013']))
  })
})

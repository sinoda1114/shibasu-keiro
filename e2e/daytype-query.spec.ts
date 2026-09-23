import { test, expect } from '@playwright/test'
import { getJstDayType } from '../lib/jst'

const LABEL = { weekday: '平日', saturday: '土曜', holiday: '休日' } as const

test('トップページの dayType が未知の値なら、今日の曜日区分を選ぶ', async ({ page }) => {
  await page.goto('/?dayType=bogus&area=nagoya')
  await expect(page.getByRole('radio', { name: LABEL[getJstDayType()] })).toBeChecked()
})

test.describe('検索結果ページ', () => {
  // PWA の Service Worker に fetch を取られると page.route のモックが効かないので止める
  test.use({ serviceWorkers: 'block' })

  test('dayType が未知の値なら平日として検索し、バッジも平日と表示する', async ({ page }) => {
    const dates: string[] = []
    await page.route('/api/routes/direct*', async (route) => {
      dates.push(new URL(route.request().url()).searchParams.get('date') ?? '')
      await route.fulfill({ json: { success: true, data: [] } })
    })
    await page.goto('/search?from=栄&to=名古屋駅&area=nagoya&dayType=bogus')
    await expect(page.getByText('平日', { exact: true })).toBeVisible()
    await expect(page.getByText('bogus')).toHaveCount(0)
  })
})

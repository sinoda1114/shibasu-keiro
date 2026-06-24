import { test, expect } from '@playwright/test'

const MOCK_TRIP = {
  tripId: 'test-1',
  routeId: '旭10',
  headsign: '横浜駅西口',
  departureStopName: '西谷妙福寺前',
  arrivalStopName: '横浜駅西口',
  departureTime: '06:00',
  arrivalTime: '06:30',
  departureSeconds: 6 * 3600,
  arrivalSeconds: 6 * 3600 + 30 * 60,
}

test.describe('終バスを過ぎた場合のUX', () => {
  test('「本日の運行は終了しました」が表示される', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: { success: true, data: [MOCK_TRIP] } })
    )

    // 06:00 が終バスなのに 23:59 で検索 → 終バス後
    await page.goto(
      '/search?from=西谷妙福寺前&to=横浜駅西口&dayType=weekday&time=23:59&timeMode=depart&provider=sotetsu_bus'
    )

    await expect(page.getByText('本日の運行は終了しました')).toBeVisible()
  })

  test('「ダイヤ区分や時刻を変えてお試しください」が表示されない', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: { success: true, data: [MOCK_TRIP] } })
    )

    await page.goto(
      '/search?from=西谷妙福寺前&to=横浜駅西口&dayType=weekday&time=23:59&timeMode=depart&provider=sotetsu_bus'
    )

    await expect(page.getByText('ダイヤ区分や時刻を変えてお試しください')).not.toBeVisible()
  })

  test('最終便の時刻が表示される', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: { success: true, data: [MOCK_TRIP] } })
    )

    await page.goto(
      '/search?from=西谷妙福寺前&to=横浜駅西口&dayType=weekday&time=23:59&timeMode=depart&provider=sotetsu_bus'
    )

    await expect(page.getByText(/最終便（06:00 発）/)).toBeVisible()
  })

  test('便がある時刻で検索した場合は通常の結果が表示される', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: { success: true, data: [MOCK_TRIP] } })
    )

    // 05:00 で検索 → 06:00 の便がある
    await page.goto(
      '/search?from=西谷妙福寺前&to=横浜駅西口&dayType=weekday&time=05:00&timeMode=depart&provider=sotetsu_bus'
    )

    await expect(page.getByText('次に乗れるバス')).toBeVisible()
    await expect(page.getByText('本日の運行は終了しました')).not.toBeVisible()
  })
})

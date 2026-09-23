import { test, expect, type Page } from '@playwright/test'

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

async function blockLocalStorage(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
  })
}

test.describe('localStorage が遮断された環境', () => {
  test('検索結果のお気に入りボタンを押してもエラーにならず、保存済みとも表示しない', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await blockLocalStorage(page)
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: { success: true, data: [MOCK_TRIP] } })
    )

    await page.goto(
      '/search?from=西谷妙福寺前&to=横浜駅西口&dayType=weekday&time=05:00&timeMode=depart&area=yokohama'
    )
    await expect(page.getByText(/06:00/).first()).toBeVisible()

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    await expect(page.getByRole('button', { name: 'お気に入りに追加' })).toBeVisible()
    expect(pageErrors).toEqual([])
  })
})

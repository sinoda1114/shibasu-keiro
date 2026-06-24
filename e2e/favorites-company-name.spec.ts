import { test, expect } from '@playwright/test'

function mockDirectRoutes(providerDisplayName: string, providerId: string, count = 2) {
  const data = Array.from({ length: count }, (_, i) => ({
    tripId: `trip-${i}`,
    routeId: 'route-1',
    headsign: null,
    departureStopName: 'from',
    arrivalStopName: 'to',
    departureTime: `0${8 + i}:00`,
    arrivalTime: `0${8 + i}:20`,
    departureSeconds: (8 + i) * 3600,
    arrivalSeconds: (8 + i) * 3600 + 1200,
    providerId,
    providerDisplayName,
  }))
  return { success: true, data }
}

test.describe('ルートお気に入りの会社名保存 — APIレスポンス別', () => {
  test('横浜駅西口→梅の木（相鉄バスの結果）はお気に入りに相鉄バスで保存される', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: mockDirectRoutes('相鉄バス', 'sotetsu_bus') })
    )
    await page.goto('/search?from=横浜駅西口&to=梅の木&area=yokohama')
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const d = localStorage.getItem('shibasu_keiro_favorites_v2')
      return d ? JSON.parse(d) : []
    })
    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('相鉄バス')
  })

  test('横浜駅前→高島町（横浜市営バスの結果）はお気に入りに横浜市営バスで保存される', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({ json: mockDirectRoutes('横浜市営バス', 'yokohama_city_bus') })
    )
    await page.goto('/search?from=横浜駅前&to=高島町&area=yokohama')
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const d = localStorage.getItem('shibasu_keiro_favorites_v2')
      return d ? JSON.parse(d) : []
    })
    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('横浜市営バス')
  })

  test('横浜市営バスと相鉄バスが混在する場合は最多便数の会社名が保存される', async ({ page }) => {
    await page.route('/api/routes/direct*', (route) =>
      route.fulfill({
        json: {
          success: true,
          data: [
            ...mockDirectRoutes('相鉄バス', 'sotetsu_bus', 3).data,
            ...mockDirectRoutes('横浜市営バス', 'yokohama_city_bus', 1).data,
          ],
        },
      })
    )
    await page.goto('/search?from=横浜駅西口&to=梅の木&area=yokohama')
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const d = localStorage.getItem('shibasu_keiro_favorites_v2')
      return d ? JSON.parse(d) : []
    })
    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('相鉄バス')
  })
})

test.describe('ルートお気に入りの会社名保存', () => {
  test('横浜エリアでお気に入り追加すると1社名だけ保存される（結果0件のフォールバック）', async ({ page }) => {
    await page.goto('/search?from=西谷妙福寺前&to=横浜駅西口&area=yokohama')

    // ★ボタンをクリック（検索結果0件でもボタンは表示される）
    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    // localStorageを確認
    const favorites = await page.evaluate(() => {
      const data = localStorage.getItem('shibasu_keiro_favorites_v2')
      return data ? JSON.parse(data) : []
    })

    expect(favorites).toHaveLength(1)
    // 1社名のみ（横浜市営バス・相鉄バスのような結合はNG）
    expect(favorites[0].providerDisplayName).not.toContain('・')
    expect(favorites[0].providerDisplayName).toBe('横浜市営バス')
  })

  test('名古屋エリアでお気に入り追加すると名古屋市バスが保存される', async ({ page }) => {
    await page.goto('/search?from=栄&to=名古屋駅&area=nagoya')

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const data = localStorage.getItem('shibasu_keiro_favorites_v2')
      return data ? JSON.parse(data) : []
    })

    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('名古屋市バス')
  })

  test('お気に入りページで会社名バッジに「・」が含まれない', async ({ page }) => {
    // 問題のあるデータをlocalStorageに設定して表示を確認
    await page.addInitScript(() => {
      const data = [
        {
          id: 'test-1',
          areaId: 'yokohama',
          providerDisplayName: '横浜市営バス',
          fromStopName: '西谷妙福寺前',
          toStopName: '横浜駅西口',
          createdAt: new Date().toISOString(),
        },
      ]
      localStorage.setItem('shibasu_keiro_favorites_v2', JSON.stringify(data))
    })
    await page.goto('/favorites')

    const badge = page.locator('[data-testid], .mantine-Badge-root').filter({ hasText: /バス/ }).first()
    // バッジテキストに「・」が含まれないこと
    const badgeText = await page.locator('.mantine-Badge-label').first().textContent()
    expect(badgeText).not.toContain('・')
  })
})

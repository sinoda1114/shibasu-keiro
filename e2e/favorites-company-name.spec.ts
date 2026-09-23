import { test, expect, type Page } from '@playwright/test'

interface RouteResult {
  tripId: string
  routeId: string
  headsign: string | null
  departureStopName: string
  arrivalStopName: string
  departureTime: string
  arrivalTime: string
  departureSeconds: number
  arrivalSeconds: number
  providerId: string
  providerDisplayName: string
}

function buildRouteResults(providerDisplayName: string, providerId: string, count = 2): RouteResult[] {
  return Array.from({ length: count }, (_, i) => ({
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
}

async function mockDirectRoutes(page: Page, results: RouteResult[]): Promise<void> {
  await page.route('/api/routes/direct*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: results, date: '20240101' }),
    })
  })
}

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

  test('横浜駅西口→梅の木は相鉄バスとして保存される（APIモック）', async ({ page }) => {
    await mockDirectRoutes(page, buildRouteResults('相鉄バス', 'sotetsu_bus', 2))
    await page.goto('/search?from=横浜駅西口&to=梅の木&area=yokohama')

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const data = localStorage.getItem('shibasu_keiro_favorites_v2')
      return data ? JSON.parse(data) : []
    })

    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('相鉄バス')
    expect(favorites[0].providerDisplayName).not.toContain('・')
  })

  test('横浜駅前→高島町は横浜市営バスとして保存される（APIモック）', async ({ page }) => {
    await mockDirectRoutes(page, buildRouteResults('横浜市営バス', 'yokohama_city_bus', 2))
    await page.goto('/search?from=横浜駅前&to=高島町&area=yokohama')

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const data = localStorage.getItem('shibasu_keiro_favorites_v2')
      return data ? JSON.parse(data) : []
    })

    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('横浜市営バス')
    expect(favorites[0].providerDisplayName).not.toContain('・')
  })

  test('検索結果の読み込み中は★を押せず、結果が届いた後は実際の社名で保存される（APIモック）', async ({ page }) => {
    let releaseResponse!: () => void
    const responseReleased = new Promise<void>((resolve) => { releaseResponse = resolve })
    let markRequested!: () => void
    const requested = new Promise<void>((resolve) => { markRequested = resolve })
    await page.route('/api/routes/direct*', async (route) => {
      markRequested()
      await responseReleased
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: buildRouteResults('相鉄バス', 'sotetsu_bus', 2), date: '20240101' }),
      })
    })
    await page.goto('/search?from=横浜駅西口&to=梅の木&area=yokohama')
    await requested

    const addButton = page.getByRole('button', { name: 'お気に入りに追加' })
    await expect(addButton).toBeDisabled()

    releaseResponse()
    await addButton.click()

    const favorites = await page.evaluate(() => {
      const data = localStorage.getItem('shibasu_keiro_favorites_v2')
      return data ? JSON.parse(data) : []
    })

    expect(favorites).toHaveLength(1)
    expect(favorites[0].providerDisplayName).toBe('相鉄バス')
  })

  test('同じページのまま検索条件が変わったら、再取得中は★を押せず新しい結果の社名で保存される（APIモック）', async ({ page }) => {
    let releaseSecond!: () => void
    const secondReleased = new Promise<void>((resolve) => { releaseSecond = resolve })
    let markSecondRequested!: () => void
    const secondRequested = new Promise<void>((resolve) => { markSecondRequested = resolve })
    await page.route('/api/routes/direct*', async (route) => {
      const isSecond = new URL(route.request().url()).searchParams.get('to') === '高島町'
      if (isSecond) {
        markSecondRequested()
        await secondReleased
      }
      const [name, id] = isSecond ? ['横浜市営バス', 'yokohama_city_bus'] : ['相鉄バス', 'sotetsu_bus']
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: buildRouteResults(name, id, 2), date: '20240101' }),
      })
    })
    await page.goto('/search?from=横浜駅西口&to=梅の木&area=yokohama')
    const addButton = page.getByRole('button', { name: 'お気に入りに追加' })
    await expect(addButton).toBeEnabled()

    await page.evaluate(() => history.pushState(null, '', '/search?from=横浜駅前&to=高島町&area=yokohama'))
    await secondRequested
    await expect(addButton).toBeDisabled()

    releaseSecond()
    await addButton.click()
    const favorites = await page.evaluate(() => JSON.parse(localStorage.getItem('shibasu_keiro_favorites_v2') ?? '[]'))
    expect(favorites).toHaveLength(1)
    expect(favorites[0]).toMatchObject({ fromStopName: '横浜駅前', toStopName: '高島町', providerDisplayName: '横浜市営バス' })
  })

  test('複数社混在時は最多便数の会社名が保存される（APIモック）', async ({ page }) => {
    const results = [
      ...buildRouteResults('横浜市営バス', 'yokohama_city_bus', 1),
      ...buildRouteResults('相鉄バス', 'sotetsu_bus', 3),
    ]
    await mockDirectRoutes(page, results)
    await page.goto('/search?from=横浜駅西口&to=梅の木&area=yokohama')

    await page.getByRole('button', { name: 'お気に入りに追加' }).click()

    const favorites = await page.evaluate(() => {
      const data = localStorage.getItem('shibasu_keiro_favorites_v2')
      return data ? JSON.parse(data) : []
    })

    expect(favorites).toHaveLength(1)
    // 相鉄バス3件 > 横浜市営バス1件 なので相鉄バスが選ばれる
    expect(favorites[0].providerDisplayName).toBe('相鉄バス')
    expect(favorites[0].providerDisplayName).not.toContain('・')
  })
})

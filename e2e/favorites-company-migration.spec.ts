import { test, expect } from '@playwright/test'

test.describe('ルートお気に入りの会社名マイグレーション', () => {
  test('「・」区切りのproviderDisplayNameを1社名に自動修正する', async ({ page }) => {
    // 旧形式（「横浜市営バス・相鉄バス」）のデータをlocalStorageに設定
    await page.addInitScript(() => {
      const data = [
        {
          id: 'migrate-1',
          areaId: 'yokohama',
          providerDisplayName: '横浜市営バス・相鉄バス',
          fromStopName: '横浜駅西口',
          toStopName: '梅の木',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      localStorage.setItem('shibasu_keiro_favorites_v2', JSON.stringify(data))
    })
    await page.goto('/favorites')

    // お気に入りページが表示されること
    await expect(page.getByText('横浜駅西口')).toBeVisible()
    await expect(page.getByText('梅の木')).toBeVisible()

    // バッジに「・」が含まれないこと（マイグレーション済み）
    const badgeText = await page.locator('.mantine-Badge-label').first().textContent()
    expect(badgeText).not.toContain('・')
    expect(badgeText).toBe('横浜市営バス')

    // localStorageのデータもマイグレーション済みに更新されていること
    const storedData = await page.evaluate(() => {
      const raw = localStorage.getItem('shibasu_keiro_favorites_v2')
      return raw ? JSON.parse(raw) : []
    })
    expect(storedData[0].providerDisplayName).toBe('横浜市営バス')
    expect(storedData[0].providerDisplayName).not.toContain('・')
  })

  test('複数の旧形式データを一括マイグレーションする', async ({ page }) => {
    await page.addInitScript(() => {
      const data = [
        {
          id: 'migrate-2a',
          areaId: 'yokohama',
          providerDisplayName: '横浜市営バス・相鉄バス',
          fromStopName: '横浜駅前',
          toStopName: '高島町',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'migrate-2b',
          areaId: 'yokohama',
          providerDisplayName: '相鉄バス',
          fromStopName: '横浜駅西口',
          toStopName: '梅の木',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'migrate-2c',
          areaId: 'nagoya',
          providerDisplayName: '名古屋市バス',
          fromStopName: '栄',
          toStopName: '名古屋駅',
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ]
      localStorage.setItem('shibasu_keiro_favorites_v2', JSON.stringify(data))
    })
    await page.goto('/favorites')
    // ページがレンダリングされてgetFavorites()が呼ばれるまで待機
    await expect(page.getByText('横浜駅前')).toBeVisible()

    // マイグレーション後のlocalStorage確認
    const storedData = await page.evaluate(() => {
      const raw = localStorage.getItem('shibasu_keiro_favorites_v2')
      return raw ? JSON.parse(raw) : []
    })

    // 旧形式が修正されていること
    expect(storedData[0].providerDisplayName).toBe('横浜市営バス')
    // 既に1社名のものは変わらないこと
    expect(storedData[1].providerDisplayName).toBe('相鉄バス')
    expect(storedData[2].providerDisplayName).toBe('名古屋市バス')
    // すべてのエントリに「・」が含まれないこと
    for (const entry of storedData) {
      expect(entry.providerDisplayName).not.toContain('・')
    }
  })

  test('正常なデータはマイグレーション不要', async ({ page }) => {
    await page.addInitScript(() => {
      const data = [
        {
          id: 'no-migrate-1',
          areaId: 'yokohama',
          providerDisplayName: '相鉄バス',
          fromStopName: '横浜駅西口',
          toStopName: '梅の木',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      localStorage.setItem('shibasu_keiro_favorites_v2', JSON.stringify(data))
    })
    await page.goto('/favorites')

    const storedData = await page.evaluate(() => {
      const raw = localStorage.getItem('shibasu_keiro_favorites_v2')
      return raw ? JSON.parse(raw) : []
    })

    expect(storedData[0].providerDisplayName).toBe('相鉄バス')
  })
})

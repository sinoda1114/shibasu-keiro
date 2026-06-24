import { test, expect } from '@playwright/test'

function setupStorage(opts: {
  favorites?: { stopName: string; areaId: string }[]
  history?: { from: string; to: string; searchedAt: string }[]
}) {
  return async ({ page }: { page: import('@playwright/test').Page }) => {
    await page.addInitScript((data) => {
      if (data.favorites) {
        localStorage.setItem('shibasu_keiro_stop_favorites_v2', JSON.stringify(data.favorites))
      }
      if (data.history) {
        localStorage.setItem('shibasu_keiro_search_history', JSON.stringify(data.history))
      }
    }, opts)
  }
}

test.describe('バス停お気に入りバッジ表示', () => {
  test('横浜エリアのお気に入り登録済みバス停にバッジが表示される', async ({ page }) => {
    await setupStorage({
      favorites: [{ stopName: '横浜駅前', areaId: 'yokohama' }],
      history: [{ from: '横浜駅前', to: '梅の木', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=yokohama')
    await page.locator('[name="from"]').click()
    await page.waitForTimeout(500)

    const option = page.locator('[role="listbox"]').getByRole('option', { name: /横浜駅前/ })
    await expect(option).toBeVisible()
    await expect(option.getByText(/横浜市営バス/)).toBeVisible()
  })

  test('名古屋エリアのお気に入り登録済みバス停に名古屋市バスバッジが表示される', async ({ page }) => {
    await setupStorage({
      favorites: [{ stopName: '栄', areaId: 'nagoya' }],
      history: [{ from: '栄', to: '名古屋駅', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=nagoya')
    await page.locator('[name="from"]').click()
    await page.waitForTimeout(500)

    const option = page.locator('[role="listbox"]').getByRole('option', { name: /栄/ })
    await expect(option).toBeVisible()
    await expect(option.getByText('名古屋市バス')).toBeVisible()
  })

  test('別エリアのお気に入りバス停はクイックアクセスに出ない（エリアフィルタ）', async ({ page }) => {
    await setupStorage({
      favorites: [
        { stopName: '栄', areaId: 'nagoya' },         // 名古屋のお気に入り（listboxを開かせるため）
        { stopName: '横浜駅前', areaId: 'yokohama' },  // 横浜のお気に入り
      ],
      history: [{ from: '栄', to: '名古屋駅', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=nagoya')
    await page.locator('[name="from"]').click()
    await page.waitForTimeout(500)

    const listbox = page.getByRole('listbox', { name: '出発バス停' })
    await expect(listbox).toBeVisible()
    // 名古屋エリアのクイックアクセスには栄が出る（名古屋のお気に入り）
    await expect(listbox.getByRole('option', { name: /栄/ })).toBeVisible()
    // 横浜のお気に入りは名古屋エリアに出ない
    await expect(listbox.getByText('横浜駅前')).not.toBeVisible()
  })

  test('★ボタンでお気に入り登録した後、ドロップダウンを再度開くとバッジが表示される', async ({ page }) => {
    await setupStorage({
      history: [{ from: '横浜駅前', to: '梅の木', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=yokohama')

    // ドロップダウンを開く
    await page.locator('[name="from"]').click()
    await page.waitForTimeout(500)

    const listbox = page.locator('[role="listbox"]')
    const option = listbox.getByRole('option', { name: /横浜駅前/ })
    await expect(option).toBeVisible()
    // まだバッジなし
    await expect(option.getByText(/横浜市営バス/)).not.toBeVisible()

    // ★ボタンを押してお気に入り登録
    await option.getByRole('button', { name: 'お気に入りに追加' }).dispatchEvent('mousedown')
    await page.waitForTimeout(300)

    // ドロップダウンを閉じて再度開く
    await page.locator('[name="from"]').blur()
    await page.waitForTimeout(200)
    await page.locator('[name="from"]').click()
    await page.waitForTimeout(500)

    // バッジが表示される
    const updatedOption = page.locator('[role="listbox"]').getByRole('option', { name: /横浜駅前/ })
    await expect(updatedOption).toBeVisible()
    await expect(updatedOption.getByText(/横浜市営バス/)).toBeVisible()
  })
})

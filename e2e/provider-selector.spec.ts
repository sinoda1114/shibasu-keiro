import { test, expect } from '@playwright/test'

test.describe('ProviderSelector', () => {
  test('トップページに都市切り替えUIが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('名古屋市バス', { exact: true })).toBeVisible()
    await expect(page.getByText('横浜市バス', { exact: true })).toBeVisible()
  })

  test('横浜市バスを選択するとURLに provider=yokohama_city_bus が付く', async ({ page }) => {
    await page.goto('/')
    await page.getByText('横浜市バス').click()
    await expect(page).toHaveURL(/provider=yokohama_city_bus/)
  })

  test('都市を切り替えるとバス停入力がリセットされる', async ({ page }) => {
    await page.goto('/?provider=nagoya_city_bus&from=栄&to=名古屋駅')
    await page.getByText('横浜市バス').click()
    await expect(page).not.toHaveURL(/from=/)
    await expect(page).not.toHaveURL(/to=/)
  })

  test('名古屋市バスに戻るとタイトルが変わる', async ({ page }) => {
    await page.goto('/?provider=yokohama_city_bus')
    await expect(page.getByText('横浜市バス 直通ルート検索')).toBeVisible()
    await page.getByText('名古屋市バス').click()
    await expect(page.getByText('名古屋市バス 直通ルート検索')).toBeVisible()
  })
})

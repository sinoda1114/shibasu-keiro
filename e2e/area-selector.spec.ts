import { test, expect } from '@playwright/test'

test.describe('AreaSelector', () => {
  test('トップページに名古屋・横浜のエリア選択UIが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('名古屋', { exact: true })).toBeVisible()
    await expect(page.getByText('横浜', { exact: true })).toBeVisible()
  })

  test('横浜を選択するとURLに area=yokohama が付く', async ({ page }) => {
    await page.goto('/')
    await page.getByText('横浜', { exact: true }).click()
    await expect(page).toHaveURL(/area=yokohama/)
  })

  test('エリアを切り替えるとバス停入力がリセットされる', async ({ page }) => {
    await page.goto('/?area=nagoya&from=栄&to=名古屋駅')
    await page.getByText('横浜', { exact: true }).click()
    await expect(page).not.toHaveURL(/from=/)
    await expect(page).not.toHaveURL(/to=/)
  })

  test('エリアを切り替えても「直通ルート検索」バッジが表示されている', async ({ page }) => {
    await page.goto('/?area=yokohama')
    await expect(page.getByText('直通ルート検索')).toBeVisible()
    await page.getByText('名古屋', { exact: true }).click()
    await expect(page.getByText('直通ルート検索')).toBeVisible()
  })
})

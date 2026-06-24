import { test, expect } from '@playwright/test'

test.describe('検索後の「戻る」でステートを復元', () => {
  test('横浜を選択して検索後、戻るとエリアが横浜のまま', async ({ page }) => {
    await page.goto('/')

    // 横浜を選択
    await page.getByText('横浜', { exact: true }).click()
    await expect(page).toHaveURL(/area=yokohama/)

    // バス停を入力
    await page.fill('[name="from"]', '西谷妙福寺前')
    await page.fill('[name="to"]', '横浜駅西口')

    // 検索実行
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/search/)

    // 戻る
    await page.goBack()
    await expect(page).toHaveURL(/\//)

    // エリアが横浜のまま（URL確認）
    await expect(page).toHaveURL(/area=yokohama/)
    // 入力欄も復元されている
    await expect(page.locator('[name="from"]')).toHaveValue('西谷妙福寺前')
    await expect(page.locator('[name="to"]')).toHaveValue('横浜駅西口')
  })

  test('検索後に戻るとバス停名が復元される', async ({ page }) => {
    await page.goto('/?area=yokohama')

    await page.fill('[name="from"]', '西谷妙福寺前')
    await page.fill('[name="to"]', '横浜駅西口')

    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/search/)

    await page.goBack()

    // バス停名が復元されている
    await expect(page.locator('[name="from"]')).toHaveValue('西谷妙福寺前')
    await expect(page.locator('[name="to"]')).toHaveValue('横浜駅西口')
  })

  test('名古屋で検索後に戻ると名古屋が選択されたまま', async ({ page }) => {
    await page.goto('/?area=nagoya')

    await page.fill('[name="from"]', '栄')
    await page.fill('[name="to"]', '名古屋')

    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/search/)

    await page.goBack()

    await expect(page).toHaveURL(/area=nagoya/)
    await expect(page.locator('[name="from"]')).toHaveValue('栄')
    await expect(page.locator('[name="to"]')).toHaveValue('名古屋')
  })
})

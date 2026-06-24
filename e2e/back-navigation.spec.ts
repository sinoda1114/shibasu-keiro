import { test, expect } from '@playwright/test'

test.describe('検索後の「戻る」でステートを復元', () => {
  test('相鉄バスを選択して検索後、戻るとプロバイダーが相鉄バスのまま', async ({ page }) => {
    await page.goto('/')

    // 相鉄バスを選択
    await page.getByText('相鉄バス').click()
    await expect(page).toHaveURL(/provider=sotetsu_bus/)

    // バス停を入力（サジェストは出なくても入力値は設定できる）
    await page.fill('[name="from"]', '西谷妙福寺前')
    await page.fill('[name="to"]', '横浜駅西口')

    // 検索実行（バス停が入力されているので検索ページへ遷移する）
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/search/)

    // 戻る
    await page.goBack()
    await expect(page).toHaveURL(/\//)

    // プロバイダーが相鉄バスのまま（URLとUI両方確認）
    await expect(page).toHaveURL(/provider=sotetsu_bus/)
    // 入力欄も復元されている
    await expect(page.locator('[name="from"]')).toHaveValue('西谷妙福寺前')
    await expect(page.locator('[name="to"]')).toHaveValue('横浜駅西口')
  })

  test('検索後に戻るとバス停名が復元される', async ({ page }) => {
    await page.goto('/?provider=sotetsu_bus')

    await page.fill('[name="from"]', '西谷妙福寺前')
    await page.fill('[name="to"]', '横浜駅西口')

    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/search/)

    await page.goBack()

    // バス停名が復元されている
    await expect(page.locator('[name="from"]')).toHaveValue('西谷妙福寺前')
    await expect(page.locator('[name="to"]')).toHaveValue('横浜駅西口')
  })

  test('名古屋市バスで検索後に戻ると名古屋が選択されたまま', async ({ page }) => {
    await page.goto('/?provider=nagoya_city_bus')

    await page.fill('[name="from"]', '栄')
    await page.fill('[name="to"]', '名古屋')

    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/search/)

    await page.goBack()

    await expect(page).toHaveURL(/provider=nagoya_city_bus/)
    await expect(page.locator('[name="from"]')).toHaveValue('栄')
    await expect(page.locator('[name="to"]')).toHaveValue('名古屋')
  })
})

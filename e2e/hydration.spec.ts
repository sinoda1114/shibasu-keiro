import { test, expect, type Page } from '@playwright/test'

const HISTORY_KEY = 'shibasu_keiro_search_history'
const FAVORITES_KEY = 'shibasu_keiro_stop_favorites_v2'
const LAST_AREA_KEY = 'shibasu_keiro_last_area'

function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = []
  const record = (text: string) => {
    if (text.includes('Hydration failed') || text.includes("didn't match")) errors.push(text)
  }
  page.on('pageerror', (e) => record(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') record(m.text())
  })
  return errors
}

test.describe('ハイドレーション不一致', () => {
  test('検索履歴が入った状態でトップページを開いても不一致が起きない', async ({ page }) => {
    const errors = collectHydrationErrors(page)

    await page.addInitScript(
      ([historyKey, favoritesKey]) => {
        localStorage.setItem(
          historyKey,
          JSON.stringify([{ from: '栄', to: '名古屋駅', searchedAt: new Date().toISOString() }])
        )
        localStorage.setItem(favoritesKey, JSON.stringify([{ stopName: '栄', areaId: 'nagoya' }]))
      },
      [HISTORY_KEY, FAVORITES_KEY]
    )

    await page.goto('/?area=nagoya')

    await expect(page.getByText('最近の検索')).toBeVisible()
    await expect(page.getByRole('button', { name: '栄 → 名古屋駅' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('前回選択エリアが保存された状態でクエリ無しのトップページを開いても不一致が起きない', async ({ page }) => {
    const errors = collectHydrationErrors(page)

    await page.addInitScript((areaKey) => {
      localStorage.setItem(areaKey, 'yokohama')
    }, LAST_AREA_KEY)

    await page.goto('/')

    await expect(page.getByRole('radio', { name: '横浜' })).toBeChecked()
    expect(errors).toEqual([])
  })
})

import { test, expect, type Locator, type Page } from '@playwright/test'

/**
 * 検索候補リストでは、お気に入り登録済みのバス停を★ボタンの状態で識別する。
 * （会社名バッジは PR #79 で廃止。エリアタブで事業者が分かるため不要と判断された）
 */
const REMOVE_STAR = 'お気に入りから削除'
const ADD_STAR = 'お気に入りに追加'

function setupStorage(opts: {
  favorites?: { stopName: string; areaId: string }[]
  history?: { from: string; to: string; searchedAt: string }[]
}) {
  return async ({ page }: { page: Page }) => {
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

/**
 * クイックアクセスのドロップダウンを開いて listbox を返す。
 *
 * ドロップダウンを開くのはハイドレーション後に動く onFocus ハンドラなので、
 * ハイドレーション前にクリックすると候補が投入されず listbox が出ない。
 * 固定待ちだと遅いマシンで再発するため、blur → click → listbox 可視化を
 * toPass で繰り返し、実際に開くまで待つ。
 */
async function openStopDropdown(page: Page, field: 'from' | 'to'): Promise<Locator> {
  const input = page.locator(`[name="${field}"]`)
  // 出発・到着の2つの Autocomplete がそれぞれ listbox を持つため、ラベルで絞る
  const listbox = page.getByRole('listbox', {
    name: field === 'from' ? '出発バス停' : '到着バス停',
  })
  await expect(async () => {
    await input.blur()
    await input.click()
    await expect(listbox).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 20_000 })
  return listbox
}

test.describe('バス停お気に入りの識別とエリア絞り込み', () => {
  test('横浜エリアのお気に入りバス停は★が登録済み状態で候補の先頭に並ぶ', async ({ page }) => {
    await setupStorage({
      favorites: [{ stopName: '横浜駅前', areaId: 'yokohama' }],
      history: [{ from: '横浜駅前', to: '梅の木', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=yokohama')

    const listbox = await openStopDropdown(page, 'from')

    // お気に入り登録済みのバス停は★が「お気に入りから削除」になっている
    const favorited = listbox.getByRole('option', { name: /横浜駅前/ })
    await expect(favorited).toBeVisible()
    await expect(favorited.getByRole('button', { name: REMOVE_STAR })).toBeVisible()

    // 履歴由来の未登録バス停は「お気に入りに追加」のまま（＝両者が区別できる）
    const notFavorited = listbox.getByRole('option', { name: /梅の木/ })
    await expect(notFavorited).toBeVisible()
    await expect(notFavorited.getByRole('button', { name: ADD_STAR })).toBeVisible()

    // お気に入りは履歴より先に並ぶ
    await expect(listbox.getByRole('option').first()).toContainText('横浜駅前')
  })

  test('名古屋エリアのお気に入りバス停も★が登録済み状態で候補の先頭に並ぶ', async ({ page }) => {
    await setupStorage({
      favorites: [{ stopName: '栄', areaId: 'nagoya' }],
      history: [{ from: '栄', to: '名古屋駅', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=nagoya')

    const listbox = await openStopDropdown(page, 'from')

    const favorited = listbox.getByRole('option', { name: /栄/ })
    await expect(favorited).toBeVisible()
    await expect(favorited.getByRole('button', { name: REMOVE_STAR })).toBeVisible()

    const notFavorited = listbox.getByRole('option', { name: /名古屋駅/ })
    await expect(notFavorited).toBeVisible()
    await expect(notFavorited.getByRole('button', { name: ADD_STAR })).toBeVisible()

    await expect(listbox.getByRole('option').first()).toContainText('栄')
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

    const listbox = await openStopDropdown(page, 'from')

    // 名古屋エリアのクイックアクセスには栄が出る（名古屋のお気に入り）
    await expect(listbox.getByRole('option', { name: /栄/ })).toBeVisible()
    // 横浜のお気に入りは名古屋エリアに出ない
    await expect(listbox.getByText('横浜駅前')).not.toBeVisible()
  })

  test('★ボタンで登録するとドロップダウンを開き直しても登録済みのまま保持される', async ({ page }) => {
    await setupStorage({
      history: [{ from: '横浜駅前', to: '梅の木', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.goto('/?area=yokohama')

    const listbox = await openStopDropdown(page, 'from')
    const option = listbox.getByRole('option', { name: /横浜駅前/ })
    await expect(option).toBeVisible()

    // まだ未登録
    await expect(option.getByRole('button', { name: ADD_STAR })).toBeVisible()

    // ★ボタンを押してお気に入り登録（mousedown でドロップダウンを閉じずに切り替える）
    await option.getByRole('button', { name: ADD_STAR }).dispatchEvent('mousedown')
    await expect(option.getByRole('button', { name: REMOVE_STAR })).toBeVisible()

    // ドロップダウンを閉じて再度開いても登録済みのまま
    const reopened = await openStopDropdown(page, 'from')
    await expect(
      reopened.getByRole('option', { name: /横浜駅前/ }).getByRole('button', { name: REMOVE_STAR })
    ).toBeVisible()

    // localStorage にも保存されている
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('shibasu_keiro_stop_favorites_v2')
      return raw ? JSON.parse(raw) : []
    })
    expect(stored).toEqual([{ stopName: '横浜駅前', areaId: 'yokohama' }])
  })

  test('★の保存に失敗したら、未登録のまま保存できないことを知らせる（容量超過など）', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await setupStorage({
      history: [{ from: '横浜駅前', to: '梅の木', searchedAt: new Date().toISOString() }],
    })({ page })
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
    })
    await page.goto('/?area=yokohama')

    const listbox = await openStopDropdown(page, 'from')
    const option = listbox.getByRole('option', { name: /横浜駅前/ })
    await option.getByRole('button', { name: ADD_STAR }).dispatchEvent('mousedown')

    await expect(page.getByText('この環境ではお気に入りを保存できません')).toBeVisible()
    await expect(option.getByRole('button', { name: ADD_STAR })).toBeVisible()
    expect(pageErrors).toEqual([])
  })
})

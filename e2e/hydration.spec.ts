import { test, expect, type Page } from '@playwright/test'
import { getJstDayType, type DayType } from '../lib/jst'

const HISTORY_KEY = 'shibasu_keiro_search_history'
const FAVORITES_KEY = 'shibasu_keiro_stop_favorites_v2'
const LAST_AREA_KEY = 'shibasu_keiro_last_area'
const ROUTE_FAVORITES_KEY = 'shibasu_keiro_favorites_v2'

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

// アプリは今日の曜日区分と現在時刻を JST で決める。CI のランナーは UTC なので、期待値も JST で出す
function jstTime(date: Date): { hh: string; mm: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => {
    const value = parts.find((p) => p.type === type)?.value
    if (value === undefined) throw new Error(`JST の ${type} を取り出せませんでした`)
    return value
  }
  return { hh: get('hour'), mm: get('minute') }
}

// 曜日区分はアプリと同じ関数で出す。曜日だけで出すと、ずらした先が平日の祝日の日に食い違って落ちる
function dayTypeOf(date: Date): DayType {
  return getJstDayType(date)
}

// サーバーと時刻も曜日区分も食い違う日時。テストランナーと dev サーバーは同じマシンで動く
function clockSkewedFromServer(): Date {
  const serverNow = new Date()
  const skewed = new Date(serverNow.getTime() + (3 * 60 + 17) * 60 * 1000)
  while (dayTypeOf(skewed) === dayTypeOf(serverNow)) skewed.setDate(skewed.getDate() + 1)
  return skewed
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

  test('ブラウザの時計がサーバーとずれていても不一致が起きない', async ({ page }) => {
    const errors = collectHydrationErrors(page)
    const browserNow = clockSkewedFromServer()
    await page.clock.setFixedTime(browserNow)

    await page.goto('/?area=nagoya')

    const { hh, mm } = jstTime(browserNow)
    await expect(page.getByRole('button', { name: `${hh}:${mm}` })).toBeVisible()
    const dayTypeLabel = { weekday: '平日', saturday: '土曜', holiday: '休日' }[dayTypeOf(browserNow)]
    await expect(page.getByRole('radio', { name: dayTypeLabel })).toBeChecked()
    expect(errors).toEqual([])
  })

  test('localStorage が遮断された環境でもエリア切替と検索ができる', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        },
      })
    })

    await page.goto('/')

    // エリア切替はハイドレーション後にしか効かないので、URL が変わるまで押し直す
    await expect(async () => {
      await page.locator('label').filter({ hasText: '横浜' }).click()
      await expect(page).toHaveURL(/area=yokohama/, { timeout: 500 })
    }).toPass({ timeout: 10_000 })

    await page.locator('[name="from"]').fill('横浜駅前')
    await page.locator('[name="to"]').fill('梅の木')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'バスを検索' }).click()

    await expect(page).toHaveURL(/\/search\?/)
    expect(pageErrors).toEqual([])
  })

  test('お気に入りルートが入った状態で /favorites を開いても不一致が起きない', async ({ page }) => {
    const errors = collectHydrationErrors(page)

    await page.addInitScript((routeFavoritesKey) => {
      localStorage.setItem(
        routeFavoritesKey,
        JSON.stringify([
          {
            id: 'hydration-1',
            areaId: 'nagoya',
            providerDisplayName: '名古屋市営バス',
            fromStopName: '栄',
            toStopName: '名古屋駅',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'hydration-2',
            areaId: 'yokohama',
            providerDisplayName: '横浜市営バス',
            fromStopName: '横浜駅西口',
            toStopName: '梅の木',
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ])
      )
    }, ROUTE_FAVORITES_KEY)

    await page.goto('/favorites')

    await expect(page.getByText('2件のルート')).toBeVisible()
    await expect(page.getByText('横浜駅西口')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('ブラウザの時計がサーバーとずれていても時刻表ページで不一致が起きない', async ({ page }) => {
    const errors = collectHydrationErrors(page)
    const browserNow = clockSkewedFromServer()
    await page.clock.setFixedTime(browserNow)

    await page.goto('/timetable?stopName=栄')

    const dayTypeLabel = { weekday: '平日', saturday: '土曜', holiday: '休日' }[dayTypeOf(browserNow)]
    await expect(page.getByRole('radio', { name: dayTypeLabel })).toBeChecked()
    expect(errors).toEqual([])
  })
})


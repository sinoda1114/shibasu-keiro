import { test, expect } from '@playwright/test'

// JST 2026-09-26（土）10:00。ニューヨークでは 2026-09-25（金）21:00 になり、曜日区分も時刻もずれる
const JST_SATURDAY_10AM = new Date('2026-09-26T01:00:00Z')

test.describe('日本以外のタイムゾーンのブラウザ', () => {
  test.use({ timezoneId: 'America/New_York' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(JST_SATURDAY_10AM)
  })

  test('トップページの現在時刻と曜日区分は JST で決まる', async ({ page }) => {
    await page.goto('/?area=nagoya')

    await expect(page.getByRole('button', { name: '10:00' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '土曜' })).toBeChecked()
  })

  test('時刻表ページの曜日区分は JST で決まる', async ({ page }) => {
    await page.goto('/timetable?stopName=栄')

    await expect(page.getByRole('radio', { name: '土曜' })).toBeChecked()
  })
})

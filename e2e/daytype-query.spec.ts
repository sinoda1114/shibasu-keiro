import { test, expect } from '@playwright/test'
import { getJstDayType } from '../lib/jst'

const LABEL = { weekday: '平日', saturday: '土曜', holiday: '休日' } as const

test('トップページの dayType が未知の値なら、今日の曜日区分を選ぶ', async ({ page }) => {
  await page.goto('/?dayType=bogus&area=nagoya')
  await expect(page.getByRole('radio', { name: LABEL[getJstDayType()] })).toBeChecked()
})

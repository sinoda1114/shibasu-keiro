import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MantineProvider } from '@mantine/core'
import HomePage from '../page'

const navigation = vi.hoisted(() => ({ searchParams: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => navigation.searchParams,
}))

function renderHome(query: string) {
  navigation.searchParams = new URLSearchParams(query)
  return render(
    <MantineProvider>
      <HomePage />
    </MantineProvider>
  )
}

describe('トップページの timeMode クエリ', () => {
  beforeEach(() => localStorage.clear())

  it('未知の値なら出発時刻を選ぶ', () => {
    renderHome('timeMode=bogus&area=nagoya')
    expect(screen.getByRole('radio', { name: '出発時刻' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '到着時刻' })).not.toBeChecked()
  })

  it('arrive なら到着時刻を選ぶ', () => {
    renderHome('timeMode=arrive&area=nagoya')
    expect(screen.getByRole('radio', { name: '到着時刻' })).toBeChecked()
  })

  it('指定が無ければ出発時刻を選ぶ', () => {
    renderHome('area=nagoya')
    expect(screen.getByRole('radio', { name: '出発時刻' })).toBeChecked()
  })
})

import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MantineProvider } from '@mantine/core'
import { TimetableController } from '../TimetableController'

// 画面に出す対象日と、API に渡す日付が同じであることを確かめる

let fetchMock: ReturnType<typeof vi.fn>

function respond(data: unknown[]) {
  fetchMock.mockResolvedValue({ json: async () => ({ success: true, data }) })
}

function requestedDates(): (string | null)[] {
  return fetchMock.mock.calls.map(([url]) => new URL(String(url), 'http://localhost').searchParams.get('date'))
}

function renderAt(iso: string) {
  // 偽装するのは Date だけにする（Mantine や testing-library のタイマーは本物のまま）
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
  return render(
    <MantineProvider>
      <TimetableController stopName="栄" provider="nagoya_city_bus" />
    </MantineProvider>,
  )
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('TimetableController の対象日の表示', () => {
  it('今日（平日）の日付を区分の近くに出し、同じ日付で API を引く', async () => {
    respond([{ headsign: '名古屋駅', entries: [{ hour: 8, minutes: [0] }], lastDeparture: { hour: 8, minute: 0 } }])
    renderAt('2026-10-13T12:00:00+09:00')

    expect(await screen.findByText('10/13（火）の運行')).toBeInTheDocument()
    expect(requestedDates()).toEqual(['20261013'])
  })

  it('祝日は祝日と分かる日付で出す', async () => {
    respond([{ headsign: '名古屋駅', entries: [{ hour: 8, minutes: [0] }], lastDeparture: { hour: 8, minute: 0 } }])
    renderAt('2026-10-12T12:00:00+09:00')

    expect(await screen.findByText('10/12（月・祝）の運行')).toBeInTheDocument()
    expect(requestedDates()).toEqual(['20261012'])
  })

  it('運行が無い日は、その日付を添えて知らせる', async () => {
    respond([])
    renderAt('2026-10-13T12:00:00+09:00')

    expect(await screen.findByText('この日（10/13（火））は運行がありません')).toBeInTheDocument()
  })

  it('区分を変えると、その区分の代表日を出し、同じ日付で API を引き直す', async () => {
    respond([])
    renderAt('2026-10-13T12:00:00+09:00')
    await screen.findByText('10/13（火）の運行')

    fireEvent.click(screen.getByText('土曜'))

    expect(await screen.findByText('10/17（土）の運行')).toBeInTheDocument()
    await waitFor(() => expect(requestedDates()).toEqual(['20261013', '20261017']))
  })
})

describe('TimetableController の応答の到着順', () => {
  it('区分を切り替えた後に前の区分の応答が遅れて届いても、今の区分の日付と便だけを出す', async () => {
    // 呼ばれた順に応答を保留し、テストから好きな順で返す
    const pending: ((data: unknown[]) => void)[] = []
    fetchMock.mockImplementation(
      () => new Promise((resolve) => {
        pending.push((data) => resolve({ json: async () => ({ success: true, data }) }))
      }),
    )
    const direction = (minute: number) => ({
      headsign: '名古屋駅', entries: [{ hour: 9, minutes: [minute] }], lastDeparture: { hour: 9, minute },
    })

    renderAt('2026-10-13T06:00:00+09:00')
    await waitFor(() => expect(pending).toHaveLength(1)) // A: 平日 10/13
    fireEvent.click(screen.getByText('土曜'))
    await waitFor(() => expect(pending).toHaveLength(2)) // B: 土曜 10/17

    await act(async () => pending[1]([direction(22)])) // B を先に返す
    await act(async () => pending[0]([direction(11)])) // A が遅れて届く

    expect(screen.getByText('10/17（土）の運行')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.queryByText('11')).not.toBeInTheDocument()
    expect(requestedDates()).toEqual(['20261013', '20261017'])
  })

  it('中断した前の要求の失敗（AbortError）はエラーとして出さない', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      // 本物の fetch と同じく、中断されたら AbortError で失敗する。中断されなければ返さない（読み込み中のまま）
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
    )

    renderAt('2026-10-13T06:00:00+09:00')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByText('土曜'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await act(async () => {}) // 前の要求の失敗が処理されるのを待つ

    expect(screen.getByText('10/17（土）の運行')).toBeInTheDocument()
    expect(screen.queryByText('エラー')).not.toBeInTheDocument()
  })
})

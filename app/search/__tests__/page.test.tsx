import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SearchResultPage from '../page'

// 検索画面が API の missingProviders（有効な版が無く検索できなかった事業者）を利用者に伝えるか（#70 の続き）。
// API は fetch をモックし、URL の検索条件は next/navigation をモックして渡す
let searchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn() }),
}))

const TRIP = {
  tripId: 'T1',
  routeId: '8系統',
  headsign: '高島町',
  departureStopName: '横浜駅前',
  arrivalStopName: '高島町',
  departureTime: '08:00',
  arrivalTime: '08:20',
  departureSeconds: 8 * 3600,
  arrivalSeconds: 8 * 3600 + 20 * 60,
  providerId: 'yokohama_city_bus',
  providerDisplayName: '横浜市営バス',
}

const NOTICE = '相鉄バスの時刻表データを準備中のため、相鉄バスの便は表示していません。'

function mockApi(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })))
}

function renderPage(query: string) {
  searchParams = new URLSearchParams(query)
  return render(<MantineProvider><SearchResultPage /></MantineProvider>)
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('検索画面: 時刻表データが無い事業者の注意書き', () => {
  it('結果が空で一部の事業者のデータが無いとき、注意書きを出し、「直通バスはありません」を検索できた事業者に限って書く', async () => {
    mockApi({ success: true, data: [], date: '20260924', sotetsuStopsExist: false, missingProviders: ['sotetsu_bus'] })
    renderPage('from=横浜駅前&to=高島町&area=yokohama')

    expect(await screen.findByText(NOTICE)).toBeInTheDocument()
    expect(screen.getByText(/直通バスはありません（横浜市営バスのデータで検索）/)).toBeInTheDocument()
    expect(screen.queryByText(/横浜市営バス・相鉄バスのデータで検索/)).not.toBeInTheDocument()
  })

  it('結果があっても一部の事業者のデータが無ければ注意書きを出す', async () => {
    mockApi({ success: true, data: [TRIP], date: '20260924', sotetsuStopsExist: false, missingProviders: ['sotetsu_bus'] })
    renderPage('from=横浜駅前&to=高島町&area=yokohama&time=00:00&timeMode=depart')

    expect(await screen.findByText(NOTICE)).toBeInTheDocument()
    expect(screen.getByText('次に乗れるバス')).toBeInTheDocument()
  })

  it('データの欠けが無ければ注意書きを出さない', async () => {
    mockApi({ success: true, data: [], date: '20260924', sotetsuStopsExist: false, missingProviders: [] })
    renderPage('from=横浜駅前&to=高島町&area=yokohama')

    expect(await screen.findByText(/直通バスはありません（横浜市営バス・相鉄バスのデータで検索）/)).toBeInTheDocument()
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it('近くから探すでも、一部の事業者のデータが無ければ注意書きを出す', async () => {
    mockApi({ success: true, data: [], date: '20260924', missingProviders: ['sotetsu_bus'] })
    renderPage('lat=35.4667&lon=139.6223&to=高島町&area=yokohama')

    expect(await screen.findByText(NOTICE)).toBeInTheDocument()
    expect(screen.getByText('近くにバス停が見つかりませんでした')).toBeInTheDocument()
  })
})

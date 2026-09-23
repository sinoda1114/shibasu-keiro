import { describe, expect, it } from 'vitest'
import { AREA_CONFIGS, PROVIDER_CONFIGS, providerIdToDisplayName } from '../providers'

describe('providerIdToDisplayName', () => {
  it('PROVIDER_CONFIGS の displayName を返す', () => {
    expect(providerIdToDisplayName('nagoya_city_bus')).toBe('名古屋市バス')
    expect(providerIdToDisplayName('yokohama_city_bus')).toBe('横浜市営バス')
    expect(providerIdToDisplayName('sotetsu_bus')).toBe('相鉄バス')
  })

  it('すべての事業者で PROVIDER_CONFIGS の定義と一致する（事業者を足しても 1 か所の修正で済む）', () => {
    for (const config of PROVIDER_CONFIGS) {
      expect(providerIdToDisplayName(config.id)).toBe(config.displayName)
    }
  })

  it('未知の事業者は providerId をそのまま返す', () => {
    expect(providerIdToDisplayName('unknown_bus')).toBe('unknown_bus')
  })
})

describe('AREA_CONFIGS', () => {
  it('各エリアの事業者はすべて PROVIDER_CONFIGS に定義がある（表示名は PROVIDER_CONFIGS から引く）', () => {
    const ids = new Set(PROVIDER_CONFIGS.map((p) => p.id))
    for (const area of AREA_CONFIGS) {
      for (const id of area.providerIds) expect(ids.has(id)).toBe(true)
    }
  })
})

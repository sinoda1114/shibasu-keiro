export const PROVIDERS = {
  NAGOYA_CITY_BUS: 'nagoya_city_bus',
  YOKOHAMA_CITY_BUS: 'yokohama_city_bus',
  SOTETSU_BUS: 'sotetsu_bus',
} as const

export type ProviderId = (typeof PROVIDERS)[keyof typeof PROVIDERS]

export interface ProviderConfig {
  id: string
  displayName: string
  shortName: string
  areaName: string
  icon: string
}

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  { id: PROVIDERS.NAGOYA_CITY_BUS, displayName: '名古屋市バス', shortName: '名古屋市バス', areaName: '名古屋市', icon: '🏯' },
  { id: PROVIDERS.YOKOHAMA_CITY_BUS, displayName: '横浜市営バス', shortName: '横浜市営バス', areaName: '横浜市', icon: '⚓' },
  { id: PROVIDERS.SOTETSU_BUS, displayName: '相鉄バス', shortName: '相鉄バス', areaName: '横浜市', icon: '🚌' },
]

export type AreaId = 'nagoya' | 'yokohama'

export interface AreaConfig {
  id: AreaId
  displayName: string
  icon: string
  providerIds: string[]
  providerDisplayNames: string[]
}

export const AREA_CONFIGS: AreaConfig[] = [
  {
    id: 'nagoya',
    displayName: '名古屋',
    icon: '🏯',
    providerIds: [PROVIDERS.NAGOYA_CITY_BUS],
    providerDisplayNames: ['名古屋市バス'],
  },
  {
    id: 'yokohama',
    displayName: '横浜',
    icon: '⚓',
    providerIds: [PROVIDERS.YOKOHAMA_CITY_BUS, PROVIDERS.SOTETSU_BUS],
    providerDisplayNames: ['横浜市営バス', '相鉄バス'],
  },
]

export const DEFAULT_AREA_ID: AreaId = 'nagoya'

export function getAreaConfig(areaId: string): AreaConfig {
  return AREA_CONFIGS.find((a) => a.id === areaId) ?? AREA_CONFIGS[0]
}

export function providerIdToAreaId(providerId: string): AreaId {
  const area = AREA_CONFIGS.find((a) => a.providerIds.includes(providerId))
  return area?.id ?? 'nagoya'
}

export function providerIdToDisplayName(providerId: string): string {
  return PROVIDER_CONFIGS.find((p) => p.id === providerId)?.displayName ?? providerId
}

export const DEFAULT_PROVIDER_ID = PROVIDERS.NAGOYA_CITY_BUS

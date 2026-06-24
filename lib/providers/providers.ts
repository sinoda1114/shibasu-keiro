export const PROVIDERS = {
  NAGOYA_CITY_BUS: 'nagoya_city_bus',
  YOKOHAMA_CITY_BUS: 'yokohama_city_bus',
} as const

export type ProviderId = (typeof PROVIDERS)[keyof typeof PROVIDERS]

export interface ProviderConfig {
  id: string
  displayName: string
  areaName: string
  icon: string
}

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  { id: PROVIDERS.NAGOYA_CITY_BUS, displayName: '名古屋市バス', areaName: '名古屋市', icon: '🏯' },
  { id: PROVIDERS.YOKOHAMA_CITY_BUS, displayName: '横浜市バス', areaName: '横浜市', icon: '⚓' },
]

export const DEFAULT_PROVIDER_ID: ProviderId = PROVIDERS.NAGOYA_CITY_BUS

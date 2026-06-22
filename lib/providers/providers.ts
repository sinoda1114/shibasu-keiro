export const PROVIDERS = {
  NAGOYA_CITY_BUS: 'nagoya_city_bus',
} as const

export type ProviderId = (typeof PROVIDERS)[keyof typeof PROVIDERS]

'use client'

import { SegmentedControl } from '@mantine/core'
import { PROVIDER_CONFIGS } from '@/lib/providers/providers'

interface ProviderSelectorProps {
  value: string
  onChange: (providerId: string) => void
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const data = PROVIDER_CONFIGS.map((config) => ({
    value: config.id,
    label: config.displayName,
  }))

  return (
    <SegmentedControl
      data={data}
      value={value}
      onChange={onChange}
      fullWidth
      size="xs"
    />
  )
}

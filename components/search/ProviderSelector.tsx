'use client'

import { SegmentedControl, Group, Text } from '@mantine/core'
import { PROVIDER_CONFIGS } from '@/lib/providers/providers'

interface ProviderSelectorProps {
  value: string
  onChange: (providerId: string) => void
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const data = PROVIDER_CONFIGS.map((config) => ({
    value: config.id,
    label: (
      <Group gap={4} align="center" wrap="nowrap" justify="center">
        <span role="img" aria-label={config.areaName}>{config.icon}</span>
        <Text size="xs" fw={500}>{config.displayName}</Text>
      </Group>
    ),
  }))

  return (
    <SegmentedControl
      data={data}
      value={value}
      onChange={onChange}
      fullWidth
      size="md"
      color="blue"
    />
  )
}

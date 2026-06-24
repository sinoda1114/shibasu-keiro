'use client'

import { SegmentedControl, Group, Text } from '@mantine/core'
import { AREA_CONFIGS } from '@/lib/providers/providers'

interface AreaSelectorProps {
  value: string
  onChange: (areaId: string) => void
}

export function AreaSelector({ value, onChange }: AreaSelectorProps) {
  const data = AREA_CONFIGS.map((config) => ({
    value: config.id,
    label: (
      <Group gap={4} align="center" wrap="nowrap" justify="center">
        <span role="img" aria-label={config.displayName}>{config.icon}</span>
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

import { Table, Text, Badge, rem, Box } from '@mantine/core'

export interface TimetableEntry {
  hour: number
  minutes: number[]
}

export interface TimetableViewProps {
  entries: TimetableEntry[]
  lastDeparture?: { hour: number; minute: number }
  currentTime?: { hour: number; minute: number }
}

function findNextDeparture(
  entries: TimetableEntry[],
  current: { hour: number; minute: number }
): { hour: number; minute: number } | null {
  for (const entry of entries) {
    if (entry.hour > current.hour) {
      if (entry.minutes.length > 0) return { hour: entry.hour, minute: entry.minutes[0] }
    } else if (entry.hour === current.hour) {
      const nextMin = entry.minutes.find((m) => m >= current.minute)
      if (nextMin !== undefined) return { hour: entry.hour, minute: nextMin }
    }
  }
  return null
}

function isLastRow(
  entry: TimetableEntry,
  lastDeparture: TimetableViewProps['lastDeparture']
): boolean {
  if (!lastDeparture) return false
  return entry.hour === lastDeparture.hour
}

export function TimetableView({ entries, lastDeparture, currentTime }: TimetableViewProps) {
  const nextDep = currentTime ? findNextDeparture(entries, currentTime) : null

  return (
    <Table
      striped
      highlightOnHover
      withTableBorder
      withColumnBorders
      style={{ borderRadius: rem(8), overflow: 'hidden' }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: rem(56), textAlign: 'center' }}>時</Table.Th>
          <Table.Th>発車時刻</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {entries.map((entry) => {
          const isLast = isLastRow(entry, lastDeparture)
          const isNextRow = nextDep !== null && entry.hour === nextDep.hour

          let rowBg: string | undefined
          if (isNextRow) rowBg = 'var(--mantine-color-blue-0)'
          else if (isLast) rowBg = 'var(--mantine-color-orange-0)'

          return (
            <Table.Tr key={entry.hour} style={rowBg ? { backgroundColor: rowBg } : undefined}>
              <Table.Td style={{ textAlign: 'center' }}>
                <Text
                  fw={isNextRow || isLast ? 700 : 400}
                  c={isNextRow ? 'blue.7' : isLast ? 'orange.7' : undefined}
                  size="sm"
                >
                  {entry.hour}
                </Text>
              </Table.Td>
              <Table.Td>
                <Box style={{ display: 'flex', flexWrap: 'wrap', gap: rem(2), alignItems: 'center' }}>
                  {entry.minutes.map((m) => {
                    const isNext = isNextRow && nextDep !== null && m === nextDep.minute
                    const isPast =
                      currentTime !== null &&
                      currentTime !== undefined &&
                      (entry.hour < currentTime.hour ||
                        (entry.hour === currentTime.hour && m < currentTime.minute))

                    if (isNext) {
                      return (
                        <Badge
                          key={m}
                          color="blue"
                          variant="filled"
                          size="sm"
                          radius="sm"
                          style={{ fontVariantNumeric: 'tabular-nums', minWidth: rem(36) }}
                        >
                          {String(m).padStart(2, '0')}
                        </Badge>
                      )
                    }

                    return (
                      <Text
                        key={m}
                        component="span"
                        size="sm"
                        fw={isLast ? 700 : 400}
                        c={isPast ? 'dimmed' : isLast ? 'orange.7' : undefined}
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: rem(24),
                          display: 'inline-block',
                          textAlign: 'center',
                          opacity: isPast ? 0.45 : 1,
                        }}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    )
                  })}
                  {isLast && (
                    <Badge
                      ml={4}
                      size="xs"
                      color="orange"
                      variant="filled"
                      style={{ verticalAlign: 'middle' }}
                    >
                      終バス
                    </Badge>
                  )}
                </Box>
              </Table.Td>
            </Table.Tr>
          )
        })}
      </Table.Tbody>
    </Table>
  )
}

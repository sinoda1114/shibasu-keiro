import { Table, Text, Badge, rem } from '@mantine/core'

export interface TimetableEntry {
  hour: number
  minutes: number[]
}

export interface TimetableViewProps {
  entries: TimetableEntry[]
  lastDeparture?: { hour: number; minute: number }
}

function isLastRow(
  entry: TimetableEntry,
  lastDeparture: TimetableViewProps['lastDeparture']
): boolean {
  if (!lastDeparture) return false
  return entry.hour === lastDeparture.hour
}

export function TimetableView({ entries, lastDeparture }: TimetableViewProps) {
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
          return (
            <Table.Tr
              key={entry.hour}
              style={
                isLast
                  ? {
                      backgroundColor: 'var(--mantine-color-orange-0)',
                    }
                  : undefined
              }
            >
              <Table.Td style={{ textAlign: 'center' }}>
                <Text
                  fw={isLast ? 700 : 400}
                  c={isLast ? 'orange.7' : undefined}
                  size="sm"
                >
                  {entry.hour}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text
                  size="sm"
                  fw={isLast ? 700 : 400}
                  c={isLast ? 'orange.7' : undefined}
                  style={{ letterSpacing: '0.05em' }}
                >
                  {entry.minutes
                    .map((m) => String(m).padStart(2, '0'))
                    .join('  ')}
                  {isLast && (
                    <Badge
                      ml="xs"
                      size="xs"
                      color="orange"
                      variant="filled"
                      style={{ verticalAlign: 'middle' }}
                    >
                      終バス
                    </Badge>
                  )}
                </Text>
              </Table.Td>
            </Table.Tr>
          )
        })}
      </Table.Tbody>
    </Table>
  )
}

import {
  Container,
  Title,
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Button,
  Divider,
  rem,
} from '@mantine/core'
import { IconDatabase, IconRefresh } from '@tabler/icons-react'

interface DataStatusRowProps {
  providerName: string
  dataVersion: string
  lastChecked: string
}

function DataStatusRow({
  providerName,
  dataVersion,
  lastChecked,
}: DataStatusRowProps) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm">
          {providerName}
        </Text>
        <Text size="xs" c="dimmed">
          データバージョン: {dataVersion}
        </Text>
        <Text size="xs" c="dimmed">
          最終チェック: {lastChecked}
        </Text>
      </Stack>
      <Badge
        variant="light"
        color="gray"
        size="sm"
        style={{ flexShrink: 0 }}
      >
        未取込
      </Badge>
    </Group>
  )
}

export default function AdminPage() {
  return (
    <Container size="sm" py="md">
      <Stack gap="lg">
        <Title order={2} size="h3">
          管理画面
        </Title>

        {/* GTFSデータ状態 */}
        <Card shadow="xs" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconDatabase
                size={rem(18)}
                color="var(--mantine-color-blue-6)"
              />
              <Text fw={700} size="sm">
                GTFSデータ状態
              </Text>
            </Group>

            <Divider />

            <DataStatusRow
              providerName="名古屋市バス"
              dataVersion="未取込"
              lastChecked="-"
            />

            <Button
              variant="light"
              size="sm"
              leftSection={<IconRefresh size={rem(14)} />}
              disabled
              title="バックエンド未実装のためモック"
            >
              手動更新
            </Button>
          </Stack>
        </Card>

        <Text c="dimmed" size="xs">
          ※ この画面はPhase 5で実装予定です。現在はスタブ表示です。
        </Text>
      </Stack>
    </Container>
  )
}

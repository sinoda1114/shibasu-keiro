'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Container,
  Title,
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Divider,
  Loader,
  Table,
  rem,
} from '@mantine/core'
import { IconDatabase, IconList } from '@tabler/icons-react'
import type { VersionWithCounts } from '@/app/api/admin/versions/route'
import type { ImportJob } from '@/app/api/admin/jobs/route'

function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'green'
    case 'staging':
      return 'yellow'
    case 'archived':
      return 'gray'
    case 'failed':
      return 'red'
    default:
      return 'gray'
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCount(n: number): string {
  return n.toLocaleString('ja-JP')
}

function AdminPageContent() {
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider') ?? 'nagoya_city_bus'

  const [versions, setVersions] = useState<VersionWithCounts[] | null>(null)
  const [jobs, setJobs] = useState<ImportJob[] | null>(null)
  const [versionsError, setVersionsError] = useState<string | null>(null)
  const [jobsError, setJobsError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/versions?provider=${encodeURIComponent(provider)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setVersions(json.data)
        } else {
          setVersionsError('バージョン情報の取得に失敗しました')
        }
      })
      .catch(() => setVersionsError('バージョン情報の取得に失敗しました'))
  }, [provider])

  useEffect(() => {
    fetch(`/api/admin/jobs?provider=${encodeURIComponent(provider)}&limit=10`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setJobs(json.data)
        } else {
          setJobsError('ジョブ履歴の取得に失敗しました')
        }
      })
      .catch(() => setJobsError('ジョブ履歴の取得に失敗しました'))
  }, [provider])

  const activeVersion = versions?.find((v) => v.status === 'active') ?? null

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        <Title order={2} size="h3">
          管理画面
        </Title>

        {/* GTFSデータ状態カード */}
        <Card shadow="xs" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconDatabase
                size={rem(18)}
                color="var(--mantine-color-blue-6)"
              />
              <Text fw={700} size="sm">
                GTFSデータ状態（名古屋市バス）
              </Text>
            </Group>

            <Divider />

            {versions === null && versionsError === null && (
              <Group justify="center" py="sm">
                <Loader size="sm" />
              </Group>
            )}

            {versionsError !== null && (
              <Text c="red" size="sm">
                {versionsError}
              </Text>
            )}

            {versions !== null && activeVersion === null && (
              <Text c="dimmed" size="sm">
                GTFSデータが未取込です
              </Text>
            )}

            {activeVersion !== null && (
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={600}>
                    バージョン名
                  </Text>
                  <Group gap="xs">
                    <Text size="sm">{activeVersion.versionName}</Text>
                    <Badge
                      variant="light"
                      color={statusColor(activeVersion.status)}
                      size="sm"
                    >
                      {activeVersion.status}
                    </Badge>
                  </Group>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    インポート日時
                  </Text>
                  <Text size="sm">{formatDate(activeVersion.importedAt)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    バス停件数
                  </Text>
                  <Text size="sm">{formatCount(activeVersion.stopCount)} 件</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    時刻件数
                  </Text>
                  <Text size="sm">
                    {formatCount(activeVersion.stopTimeCount)} 件
                  </Text>
                </Group>
              </Stack>
            )}
          </Stack>
        </Card>

        {/* バージョン履歴テーブル */}
        <Card shadow="xs" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconList size={rem(18)} color="var(--mantine-color-blue-6)" />
              <Text fw={700} size="sm">
                バージョン履歴
              </Text>
            </Group>

            <Divider />

            {versions === null && versionsError === null && (
              <Group justify="center" py="sm">
                <Loader size="sm" />
              </Group>
            )}

            {versionsError !== null && (
              <Text c="red" size="sm">
                {versionsError}
              </Text>
            )}

            {versions !== null && versions.length === 0 && (
              <Text c="dimmed" size="sm">
                GTFSデータが未取込です
              </Text>
            )}

            {versions !== null && versions.length > 0 && (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>バージョン名</Table.Th>
                    <Table.Th>ステータス</Table.Th>
                    <Table.Th>インポート日時</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>バス停数</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>時刻数</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {versions.map((v) => (
                    <Table.Tr key={v.id}>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {v.versionName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={statusColor(v.status)}
                          size="sm"
                        >
                          {v.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDate(v.importedAt)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm">{formatCount(v.stopCount)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm">{formatCount(v.stopTimeCount)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>

        {/* インポートジョブ履歴 */}
        <Card shadow="xs" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconList size={rem(18)} color="var(--mantine-color-violet-6)" />
              <Text fw={700} size="sm">
                インポートジョブ履歴（最新10件）
              </Text>
            </Group>

            <Divider />

            {jobs === null && jobsError === null && (
              <Group justify="center" py="sm">
                <Loader size="sm" />
              </Group>
            )}

            {jobsError !== null && (
              <Text c="red" size="sm">
                {jobsError}
              </Text>
            )}

            {jobs !== null && jobs.length === 0 && (
              <Text c="dimmed" size="sm">
                GTFSデータが未取込です
              </Text>
            )}

            {jobs !== null && jobs.length > 0 && (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>開始時刻</Table.Th>
                    <Table.Th>ステータス</Table.Th>
                    <Table.Th>完了時刻</Table.Th>
                    <Table.Th>エラー</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {jobs.map((j) => (
                    <Table.Tr key={j.id}>
                      <Table.Td>
                        <Text size="sm">{formatDate(j.startedAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={statusColor(j.status)}
                          size="sm"
                        >
                          {j.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDate(j.finishedAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        {j.errorMessage ? (
                          <Text size="xs" c="red" lineClamp={2}>
                            {j.errorMessage}
                          </Text>
                        ) : (
                          <Text size="xs" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <Container size="md" py="md">
          <Text c="dimmed">読み込み中...</Text>
        </Container>
      }
    >
      <AdminPageContent />
    </Suspense>
  )
}

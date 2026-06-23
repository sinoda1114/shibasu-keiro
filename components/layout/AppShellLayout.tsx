'use client'

import { AppShell, Group, Stack, Text, UnstyledButton, rem } from '@mantine/core'
import { usePathname, useRouter } from 'next/navigation'
import {
  IconSearch,
  IconStar,
} from '@tabler/icons-react'

const navItems = [
  { label: '検索', href: '/', icon: IconSearch },
  { label: 'お気に入り', href: '/favorites', icon: IconStar },
] as const

interface AppShellLayoutProps {
  children: React.ReactNode
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <AppShell
      footer={{ height: 60 }}
      padding="md"
    >
      <AppShell.Main>
        {children}
      </AppShell.Main>
      <AppShell.Footer>
        <Group justify="space-around" h="100%" px="xs">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <UnstyledButton
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{ flex: 1 }}
              >
                <Stack gap={2} align="center">
                  <Icon
                    size={rem(24)}
                    stroke={1.5}
                    color={
                      isActive
                        ? 'var(--mantine-color-blue-6)'
                        : 'var(--mantine-color-gray-6)'
                    }
                  />
                  <Text
                    size="xs"
                    c={isActive ? 'blue.6' : 'gray.6'}
                    fw={isActive ? 600 : 400}
                  >
                    {item.label}
                  </Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  )
}

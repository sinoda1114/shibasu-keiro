import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import type { Metadata, Viewport } from 'next'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { AppShellLayout } from '@/components/layout/AppShellLayout'

export const metadata: Metadata = {
  title: '市バスかんたん時刻表',
  description: '名古屋市バスの直通ルート検索・時刻表確認アプリ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <AppShellLayout>{children}</AppShellLayout>
        </MantineProvider>
      </body>
    </html>
  )
}

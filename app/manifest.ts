import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '市バスかんたん検索',
    short_name: '市バス検索',
    description: '名古屋市バスの直通ルート検索',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#228be6',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}

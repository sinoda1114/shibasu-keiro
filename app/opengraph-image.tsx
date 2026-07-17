import { ImageResponse } from 'next/og'
import { ShibasuIconArtwork } from './_components/ShibasuIconArtwork'

export const alt = '市バスかんたん検索 — 名古屋市バスの直通ルート検索'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const blue = '#228be6'
const yellow = '#ffd43b'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#f8fbff',
          color: '#102a43',
          fontFamily: 'sans-serif',
          padding: '72px 84px',
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShibasuIconArtwork />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 58 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: blue,
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            名古屋市バス、横浜市バス
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.05,
              flexDirection: 'column',
            }}
          >
            <span>市バスかんたん</span>
            <span>検索</span>
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              color: '#486581',
              fontSize: 44,
              fontWeight: 600,
            }}
          >
            市バスの直通検索
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 34,
              color: '#243b53',
              fontSize: 35,
              fontWeight: 600,
            }}
          >
            <span style={{ color: yellow, fontSize: 49, lineHeight: 1 }}>●</span>
            <span style={{ marginLeft: 12 }}>ルートと時刻表をかんたん確認</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

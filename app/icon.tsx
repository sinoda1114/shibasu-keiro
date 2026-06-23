import { ImageResponse } from 'next/og'
import { ShibasuIconArtwork } from './_components/ShibasuIconArtwork'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<ShibasuIconArtwork />, { ...size })
}

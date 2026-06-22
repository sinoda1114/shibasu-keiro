import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * GTFS ZIPをダウンロードして展開する
 */
export async function downloadAndExtract(url: string, destDir: string): Promise<void> {
  console.log(`Downloading GTFS from ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)

  const buf = Buffer.from(await res.arrayBuffer())
  console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`)

  const tmpZip = join(destDir, 'gtfs.zip')
  mkdirSync(destDir, { recursive: true })
  writeFileSync(tmpZip, buf)

  console.log(`Extracting to ${destDir}...`)
  try {
    execFileSync('unzip', ['-o', tmpZip, '-d', destDir], { stdio: 'pipe' })
  } catch {
    // unzip コマンドが使えない場合は JSでフォールバック
    console.log('unzip command not available, using JS fallback...')
    await extractZipJs(buf, destDir)
  } finally {
    try {
      rmSync(tmpZip)
    } catch {
      // 削除失敗は無視
    }
  }

  console.log('Extraction complete.')
}

/**
 * ZIP バイナリをパースして展開する（pure JS フォールバック）
 * ZIPのローカルファイルヘッダーを手動パース
 */
async function extractZipJs(buf: Buffer, destDir: string): Promise<void> {
  const { inflateRawSync } = await import('node:zlib')
  const { writeFileSync, mkdirSync } = await import('node:fs')
  const { join, dirname } = await import('node:path')

  let offset = 0

  while (offset < buf.length - 4) {
    // ローカルファイルヘッダーのシグネチャ: PK\x03\x04
    const sig = buf.readUInt32LE(offset)
    if (sig !== 0x04034b50) break

    const compression = buf.readUInt16LE(offset + 8)
    const compressedSize = buf.readUInt32LE(offset + 18)
    const uncompressedSize = buf.readUInt32LE(offset + 22)
    const fileNameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const fileName = buf.slice(offset + 30, offset + 30 + fileNameLen).toString('utf8')

    const dataOffset = offset + 30 + fileNameLen + extraLen
    const compressedData = buf.slice(dataOffset, dataOffset + compressedSize)

    const outPath = join(destDir, fileName)

    if (fileName.endsWith('/')) {
      mkdirSync(outPath, { recursive: true })
    } else {
      mkdirSync(dirname(outPath), { recursive: true })
      if (compression === 0) {
        // 非圧縮
        writeFileSync(outPath, compressedData)
      } else if (compression === 8) {
        // DEFLATE
        const decompressed = inflateRawSync(compressedData)
        writeFileSync(outPath, decompressed)
      } else {
        throw new Error(`Unsupported compression method: ${compression} for ${fileName}`)
      }
    }

    offset = dataOffset + compressedSize
  }
}

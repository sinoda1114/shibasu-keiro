// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseGtfsFile } from '../parse'

const BOM = '﻿'

let dir: string

function writeGtfs(filename: string, content: string): void {
  writeFileSync(path.join(dir, filename), content, 'utf8')
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'gtfs-parse-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('parseGtfsFile', () => {
  it('ファイルが無いときは空配列を返す', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseGtfsFile(dir, 'stops.txt')).toEqual([])
    warn.mockRestore()
  })

  it('BOM 付き UTF-8 のヘッダーを列名として読む', () => {
    writeGtfs(
      'stops.txt',
      `${BOM}stop_id,stop_name,stop_lat,stop_lon\n1,名古屋駅,35.17,136.88\n`
    )
    expect(parseGtfsFile(dir, 'stops.txt')).toEqual([
      { stop_id: '1', stop_name: '名古屋駅', stop_lat: '35.17', stop_lon: '136.88' },
    ])
  })

  it('BOM 付きでヘッダーがクォートされていても列名を読む', () => {
    writeGtfs('stops.txt', `${BOM}"stop_id","stop_name"\n"1","栄"\n`)
    expect(parseGtfsFile(dir, 'stops.txt')).toEqual([{ stop_id: '1', stop_name: '栄' }])
  })

  it('CRLF の改行を扱う', () => {
    writeGtfs('stops.txt', 'stop_id,stop_name\r\n1,栄\r\n2,金山\r\n')
    expect(parseGtfsFile(dir, 'stops.txt')).toEqual([
      { stop_id: '1', stop_name: '栄' },
      { stop_id: '2', stop_name: '金山' },
    ])
  })

  it('クォート内のカンマ・改行・二重引用符を値として残す', () => {
    writeGtfs(
      'routes.txt',
      'route_id,route_long_name\n1,"名古屋駅,栄"\n2,"上り\n下り"\n3,"""基幹"" バス"\n'
    )
    expect(parseGtfsFile(dir, 'routes.txt')).toEqual([
      { route_id: '1', route_long_name: '名古屋駅,栄' },
      { route_id: '2', route_long_name: '上り\n下り' },
      { route_id: '3', route_long_name: '"基幹" バス' },
    ])
  })

  it('空欄と空のクォートは空文字になる', () => {
    writeGtfs('trips.txt', 'trip_id,trip_headsign,direction_id\nT1,,\nT2,"",0\n')
    expect(parseGtfsFile(dir, 'trips.txt')).toEqual([
      { trip_id: 'T1', trip_headsign: '', direction_id: '' },
      { trip_id: 'T2', trip_headsign: '', direction_id: '0' },
    ])
  })

  it('空行と末尾の改行なしを扱う', () => {
    writeGtfs('calendar_dates.txt', 'service_id,date,exception_type\n\nS1,20260101,1\n\n\nS2,20260102,2')
    expect(parseGtfsFile(dir, 'calendar_dates.txt')).toEqual([
      { service_id: 'S1', date: '20260101', exception_type: '1' },
      { service_id: 'S2', date: '20260102', exception_type: '2' },
    ])
  })

  it('クォート外の前後の空白（半角・タブ・全角）を除き、クォート内と語中の空白は残す', () => {
    writeGtfs(
      'stops.txt',
      ' stop_id , stop_name \n 1 ,\t栄　\n2,  "  金山  " \n3,　名古屋　駅\n'
    )
    expect(parseGtfsFile(dir, 'stops.txt')).toEqual([
      { stop_id: '1', stop_name: '栄' },
      { stop_id: '2', stop_name: '  金山  ' },
      { stop_id: '3', stop_name: '名古屋　駅' },
    ])
  })

  it('列名 __proto__ はプロトタイプを差し替えず、通常のプロパティとして持つ', () => {
    writeGtfs('stops.txt', '__proto__,stop_id\npolluted,1\n')
    const [record] = parseGtfsFile(dir, 'stops.txt')
    expect(Object.getPrototypeOf(record)).toBe(Object.prototype)
    expect(Object.getOwnPropertyNames(record)).toEqual(['__proto__', 'stop_id'])
    expect(record.stop_id).toBe('1')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

import { parse } from 'csv-parse/sync'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * GTFSファイルをCSVパースしてオブジェクト配列で返す
 */
export function parseGtfsFile<T extends Record<string, string>>(
  dir: string,
  filename: string
): T[] {
  const path = join(dir, filename)
  if (!existsSync(path)) {
    console.warn(`  [skip] ${filename} not found`)
    return []
  }
  const content = readFileSync(path)
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // BOM付きUTF-8に対応
  }) as T[]
}

// 各GTFSファイルの型定義（インデックスシグネチャでRecord<string,string>制約を満たす）
export interface GtfsStop extends Record<string, string> {
  stop_id: string
  stop_name: string
  stop_lat: string
  stop_lon: string
}

export interface GtfsRoute extends Record<string, string> {
  route_id: string
  route_short_name: string
  route_long_name: string
  agency_id: string
}

export interface GtfsTrip extends Record<string, string> {
  trip_id: string
  route_id: string
  service_id: string
  trip_headsign: string
  direction_id: string
}

export interface GtfsStopTime extends Record<string, string> {
  trip_id: string
  arrival_time: string
  departure_time: string
  stop_id: string
  stop_sequence: string
}

export interface GtfsCalendar extends Record<string, string> {
  service_id: string
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
  start_date: string
  end_date: string
}

export interface GtfsCalendarDate extends Record<string, string> {
  service_id: string
  date: string
  exception_type: string
}

export interface GtfsAgency extends Record<string, string> {
  agency_id: string
  agency_name: string
  agency_url: string
  agency_timezone: string
}

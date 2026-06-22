import { db } from '../lib/db/client'
import {
  providers, gtfsVersions, gtfsImportJobs,
  busStops, busRoutes, busTrips, busStopTimes,
  gtfsCalendar, gtfsCalendarDates,
} from '../lib/db/schema'

async function main() {
  console.log('Clearing all GTFS data...')

  // FK 依存順に削除
  await db.delete(busStopTimes)
  console.log('  bus_stop_times cleared')
  await db.delete(busTrips)
  console.log('  bus_trips cleared')
  await db.delete(busRoutes)
  console.log('  bus_routes cleared')
  await db.delete(busStops)
  console.log('  bus_stops cleared')
  await db.delete(gtfsCalendarDates)
  console.log('  gtfs_calendar_dates cleared')
  await db.delete(gtfsCalendar)
  console.log('  gtfs_calendar cleared')
  await db.delete(gtfsImportJobs)
  console.log('  gtfs_import_jobs cleared')
  await db.delete(gtfsVersions)
  console.log('  gtfs_versions cleared')
  await db.delete(providers)
  console.log('  providers cleared')

  // providers に nagoya_city_bus を再投入
  await db.insert(providers).values({
    id: 'nagoya_city_bus',
    name: 'nagoya_city_bus',
    displayName: '名古屋市バス',
    areaName: '名古屋市',
    gtfsSourceUrl: process.env.NAGOYA_GTFS_URL ?? null,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  console.log('  providers seeded: nagoya_city_bus')

  console.log('Done. Ready for clean import.')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

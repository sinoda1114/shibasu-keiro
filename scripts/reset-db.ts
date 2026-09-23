import { getDb } from '../lib/db/client'
import { redactUrl } from '../lib/redact-url'
import {
  providers, gtfsVersions, gtfsImportJobs,
  busStops, busRoutes, busTrips, busStopTimes,
  gtfsCalendar, gtfsCalendarDates,
} from '../lib/db/schema'

async function main() {
  console.log('Clearing all GTFS data...')

  // FK 依存順に削除
  await getDb().delete(busStopTimes)
  console.log('  bus_stop_times cleared')
  await getDb().delete(busTrips)
  console.log('  bus_trips cleared')
  await getDb().delete(busRoutes)
  console.log('  bus_routes cleared')
  await getDb().delete(busStops)
  console.log('  bus_stops cleared')
  await getDb().delete(gtfsCalendarDates)
  console.log('  gtfs_calendar_dates cleared')
  await getDb().delete(gtfsCalendar)
  console.log('  gtfs_calendar cleared')
  await getDb().delete(gtfsImportJobs)
  console.log('  gtfs_import_jobs cleared')
  await getDb().delete(gtfsVersions)
  console.log('  gtfs_versions cleared')
  await getDb().delete(providers)
  console.log('  providers cleared')

  // providers に nagoya_city_bus を再投入
  await getDb().insert(providers).values({
    id: 'nagoya_city_bus',
    name: 'nagoya_city_bus',
    displayName: '名古屋市バス',
    areaName: '名古屋市',
    gtfsSourceUrl: process.env.NAGOYA_GTFS_URL ? redactUrl(process.env.NAGOYA_GTFS_URL) : null,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  console.log('  providers seeded: nagoya_city_bus')

  console.log('Done. Ready for clean import.')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

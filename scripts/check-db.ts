import { db } from '../lib/db/client'
import { busStops, busRoutes, busTrips, busStopTimes, gtfsVersions, gtfsImportJobs } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

async function main() {
  const [stops] = await db.select({ count: sql<number>`count(*)` }).from(busStops)
  const [routes] = await db.select({ count: sql<number>`count(*)` }).from(busRoutes)
  const [trips] = await db.select({ count: sql<number>`count(*)` }).from(busTrips)
  const [stopTimes] = await db.select({ count: sql<number>`count(*)` }).from(busStopTimes)
  const versions = await db.select().from(gtfsVersions).limit(5)
  const jobs = await db.select().from(gtfsImportJobs).limit(5)

  console.log('stops     :', stops.count)
  console.log('routes    :', routes.count)
  console.log('trips     :', trips.count)
  console.log('stop_times:', stopTimes.count)
  console.log('versions  :', versions.map(v => `${v.versionName} [${v.status}]`))
  console.log('jobs      :', jobs.map(j => `${j.status}${j.errorMessage ? ' ERR:' + j.errorMessage.slice(0, 80) : ''}`))
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

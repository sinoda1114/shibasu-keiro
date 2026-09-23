import { getDb } from '../lib/db/client'
import { busStops, busRoutes, busTrips, busStopTimes } from '../lib/db/schema'
import { sql } from 'drizzle-orm'
import { PROVIDER_CONFIGS } from '../lib/providers/providers'
import { getImportStatus } from './import-status'

const RECENT_LIMIT = 5

async function main() {
  const [stops] = await getDb().select({ count: sql<number>`count(*)` }).from(busStops)
  const [routes] = await getDb().select({ count: sql<number>`count(*)` }).from(busRoutes)
  const [trips] = await getDb().select({ count: sql<number>`count(*)` }).from(busTrips)
  const [stopTimes] = await getDb().select({ count: sql<number>`count(*)` }).from(busStopTimes)

  console.log('stops     :', stops.count)
  console.log('routes    :', routes.count)
  console.log('trips     :', trips.count)
  console.log('stop_times:', stopTimes.count)

  for (const provider of PROVIDER_CONFIGS) {
    const { activeVersion, versions, jobs } = await getImportStatus(provider.id, RECENT_LIMIT)
    console.log(`\n[${provider.displayName}] 有効な版: ${activeVersion ? activeVersion.versionName : 'なし'}`)
    console.log('  versions:', versions.map(v => `${v.versionName} [${v.status}] ${v.createdAt}`))
    console.log('  jobs    :', jobs.map(j => `${j.createdAt} ${j.status}${j.errorMessage ? ' ERR:' + j.errorMessage.slice(0, 120) : ''}`))
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
